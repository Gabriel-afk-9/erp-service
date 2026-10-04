import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { BazarTransfer, normalizeExternalReference } from "../../../domain/entities/bazar-transfer.entity.js";
import { ReceiptLine } from "../../../domain/entities/receipt-line.entity.js";
import { StockLot } from "../../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../../domain/entities/stock-movement.entity.js";
import { StockReceipt } from "../../../domain/entities/stock-receipt.entity.js";
import { ReceiptInvalidError } from "../../../domain/errors/receipt-invalid.error.js";
import { ReceiptOperationConflictError } from "../../../domain/errors/receipt-operation-conflict.error.js";
import type { BazarTransferRepository } from "../../../domain/repositories/bazar-transfer.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { ReceiptRepository } from "../../../domain/repositories/receipt.repository.js";
import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import { receiptFingerprint } from "../../services/receipt-fingerprint.js";
import { validateReceiptLine } from "../../services/validate-receipt-line.js";
import type { RegisterBazarTransferInput } from "./register-bazar-transfer.input.js";
import type { RegisterBazarTransferOutput } from "./register-bazar-transfer.output.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class RegisterBazarTransferUseCase {
  constructor(
    private readonly transfers: BazarTransferRepository,
    private readonly receipts: ReceiptRepository,
    private readonly items: ItemRepository,
    private readonly units: UnitRepository,
  ) {}

  async execute(input: RegisterBazarTransferInput): Promise<RegisterBazarTransferOutput> {
    const externalReference = normalizeExternalReference(input.externalReference);
    if (externalReference.length < 1) {
      throw new ReceiptInvalidError("externalReference is required");
    }
    // D1.1 — reference first: replay returns the existing transfer untouched.
    const replay = await this.transfers.findByExternalReference(externalReference);
    if (replay !== null) {
      return { transferId: replay.id, receiptId: replay.receiptId, duplicate: true };
    }
    if (input.lines.length === 0) {
      throw new ReceiptInvalidError("at least one line is required");
    }
    const receivedAt = CivilDate.from(input.receivedAt);
    if (input.receivedAt > today()) {
      throw new ReceiptInvalidError("receivedAt cannot be in the future");
    }
    // D1.2 — operation key only matters for a new reference.
    const fingerprint = receiptFingerprint({
      originType: "BAZAR",
      donorName: input.donorName ?? null,
      receivedAt: input.receivedAt,
      note: input.note ?? null,
      lines: input.lines,
    });
    const existing = await this.receipts.findByOperationKey(input.operationKey);
    if (existing !== null) {
      if (existing.fingerprint !== fingerprint) {
        throw new ReceiptOperationConflictError(input.operationKey);
      }
      const linked = await this.transfers.findByExternalReference(externalReference);
      if (linked !== null) {
        return { transferId: linked.id, receiptId: linked.receiptId, duplicate: true };
      }
      throw new ReceiptOperationConflictError(input.operationKey);
    }
    const receipt = StockReceipt.create({
      originType: "BAZAR",
      donorName: input.donorName ?? null,
      receivedBy: input.actorId,
      receivedAt,
      note: input.note ?? null,
      operationKey: input.operationKey,
      fingerprint,
    });
    const lines: ReceiptLine[] = [];
    const lots: StockLot[] = [];
    const movements: StockMovement[] = [];
    for (const raw of input.lines) {
      // RF-BAZ-01: bazar lines always carry the informed quantity, even when nothing arrived.
      if (raw.informedQuantity === undefined || raw.informedQuantity === null) {
        throw new ReceiptInvalidError("informedQuantity is required for bazar lines");
      }
      const { line } = await validateReceiptLine(this.items, this.units, receipt.id, raw);
      lines.push(line);
      if (line.acceptedQuantity > 0) {
        const lot = StockLot.create({
          itemId: line.itemId,
          unitId: line.unitId,
          receiptLineId: line.id,
          expiresOn: line.expiresOn,
        });
        lots.push(lot);
        movements.push(
          StockMovement.create({
            itemId: line.itemId,
            unitId: line.unitId,
            lotId: lot.id,
            receiptLineId: line.id,
            type: "BAZAR_IN",
            quantity: line.acceptedQuantity,
            occurredAt: receivedAt,
            recordedBy: input.actorId,
          }),
        );
      }
      if (line.rejectedQuantity > 0) {
        movements.push(
          StockMovement.create({
            itemId: line.itemId,
            unitId: line.unitId,
            lotId: null,
            receiptLineId: line.id,
            type: "TRIAGE_DISCARD",
            quantity: line.rejectedQuantity,
            occurredAt: receivedAt,
            recordedBy: input.actorId,
            reason: line.rejectionReason,
          }),
        );
      }
    }
    const transfer = BazarTransfer.create({ receiptId: receipt.id, externalReference });
    await this.transfers.saveFull(transfer, receipt, lines, lots, movements);
    return { transferId: transfer.id, receiptId: receipt.id, duplicate: false };
  }
}
