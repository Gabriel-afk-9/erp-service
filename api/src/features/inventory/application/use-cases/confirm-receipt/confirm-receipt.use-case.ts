import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { ReceiptLine } from "../../../domain/entities/receipt-line.entity.js";
import { StockLot } from "../../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../../domain/entities/stock-movement.entity.js";
import { StockReceipt } from "../../../domain/entities/stock-receipt.entity.js";
import { ItemInactiveError } from "../../../domain/errors/item-inactive.error.js";
import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import { LotExpirationRequiredError } from "../../../domain/errors/lot-expiration-required.error.js";
import { ReceiptInvalidError } from "../../../domain/errors/receipt-invalid.error.js";
import { ReceiptLineInvalidError } from "../../../domain/errors/receipt-line-invalid.error.js";
import { ReceiptOperationConflictError } from "../../../domain/errors/receipt-operation-conflict.error.js";
import { UnitMismatchError } from "../../../domain/errors/unit-mismatch.error.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { ReceiptRepository } from "../../../domain/repositories/receipt.repository.js";
import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import { receiptFingerprint } from "../../services/receipt-fingerprint.js";
import type { ConfirmReceiptInput } from "./confirm-receipt.input.js";
import type { ConfirmReceiptOutput } from "./confirm-receipt.output.js";

function fractionDigits(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  if (dot === -1) return 0;
  return text.length - dot - 1;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ConfirmStockReceiptUseCase {
  constructor(
    private readonly receipts: ReceiptRepository,
    private readonly items: ItemRepository,
    private readonly units: UnitRepository,
  ) {}

  async execute(input: ConfirmReceiptInput): Promise<ConfirmReceiptOutput> {
    if (input.lines.length === 0) {
      throw new ReceiptInvalidError("at least one line is required");
    }
    const receivedAt = CivilDate.from(input.receivedAt);
    if (input.receivedAt > today()) {
      throw new ReceiptInvalidError("receivedAt cannot be in the future");
    }
    const fingerprint = receiptFingerprint({
      originType: input.originType,
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
      return { receiptId: existing.id, duplicate: true };
    }
    const receipt = StockReceipt.create({
      originType: input.originType,
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
      const item = await this.items.findById(raw.itemId);
      if (item === null) {
        throw new ItemNotFoundError(raw.itemId);
      }
      if (!item.isActive) {
        throw new ItemInactiveError(raw.itemId);
      }
      const unit = await this.units.findById(item.unitId);
      if (unit === null) {
        throw new UnitMismatchError(item.id, item.unitId, "unknown");
      }
      for (const quantity of [raw.receivedQuantity, raw.acceptedQuantity, raw.rejectedQuantity]) {
        if (fractionDigits(quantity) > unit.decimalPlaces) {
          throw new ReceiptLineInvalidError(
            `quantity ${quantity} exceeds unit ${unit.symbol} precision of ${unit.decimalPlaces} decimal places`,
          );
        }
      }
      if (raw.acceptedQuantity > 0 && item.requiresExpiration && (raw.expiresOn ?? null) === null) {
        throw new LotExpirationRequiredError(item.id);
      }
      const line = ReceiptLine.create({
        receiptId: receipt.id,
        itemId: item.id,
        unitId: item.unitId,
        informedQuantity: raw.informedQuantity ?? null,
        receivedQuantity: raw.receivedQuantity,
        acceptedQuantity: raw.acceptedQuantity,
        rejectedQuantity: raw.rejectedQuantity,
        rejectionReason: raw.rejectionReason ?? null,
        expiresOn: raw.expiresOn ?? null,
      });
      lines.push(line);
      if (line.acceptedQuantity > 0) {
        const lot = StockLot.create({
          itemId: item.id,
          unitId: item.unitId,
          receiptLineId: line.id,
          expiresOn: line.expiresOn,
        });
        lots.push(lot);
        movements.push(
          StockMovement.create({
            itemId: item.id,
            unitId: item.unitId,
            lotId: lot.id,
            receiptLineId: line.id,
            type: "DONATION_IN",
            quantity: line.acceptedQuantity,
            occurredAt: receivedAt,
            recordedBy: input.actorId,
          }),
        );
      }
      if (line.rejectedQuantity > 0) {
        movements.push(
          StockMovement.create({
            itemId: item.id,
            unitId: item.unitId,
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
    await this.receipts.saveFull(receipt, lines, lots, movements);
    return { receiptId: receipt.id, duplicate: false };
  }
}
