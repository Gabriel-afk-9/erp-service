import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { ReasonRequiredError } from "../../../../atd/domain/errors/reason-required.error.js";
import type { ServiceRecordRepository } from "../../../../atd/domain/repositories/service-record.repository.js";
import { DeliveryNotFoundError } from "../../../domain/errors/delivery-not-found.error.js";
import { DeliveryReversal } from "../../../domain/entities/delivery-reversal.entity.js";
import type { DeliveryRepository } from "../../../domain/repositories/delivery.repository.js";
import { StockMovement } from "../../../../inventory/domain/entities/stock-movement.entity.js";
import type { LotRepository } from "../../../../inventory/domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../../../inventory/domain/repositories/movement.repository.js";
import type { ReverseDeliveryInput } from "./reverse-delivery.input.js";
import type { ReverseDeliveryOutput } from "./reverse-delivery.output.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ReverseDeliveryUseCase {
  constructor(
    private readonly deliveries: DeliveryRepository,
    private readonly serviceRecords: ServiceRecordRepository,
    private readonly lots: LotRepository,
    private readonly movements: MovementRepository,
  ) {}

  async execute(input: ReverseDeliveryInput): Promise<ReverseDeliveryOutput> {
    if (input.reason.trim().length < 3) {
      throw new ReasonRequiredError();
    }
    const delivery = await this.deliveries.findById(input.deliveryId);
    if (delivery === null) {
      throw new DeliveryNotFoundError(input.deliveryId);
    }
    // Idempotent by delivery: any existing reversal wins, no new credit.
    const replay = await this.deliveries.findReversalByDeliveryId(delivery.id);
    if (replay !== null) {
      return { reversalId: replay.id, duplicate: true };
    }
    if (delivery.status !== "COMPLETED") {
      throw new DeliveryNotFoundError(input.deliveryId);
    }
    const found = await this.serviceRecords.findById(delivery.serviceRecordId);
    if (found === null) {
      throw new DeliveryNotFoundError(delivery.serviceRecordId);
    }
    const reversedAt = CivilDate.from(input.reversedAt ?? today());
    const lines = await this.deliveries.findLinesByDeliveryId(delivery.id);
    const reversal = DeliveryReversal.create({
      deliveryId: delivery.id,
      reason: input.reason.trim(),
      reversedAt,
      reversedBy: input.actorId,
    });
    const movements: StockMovement[] = [];
    for (const line of lines) {
      const lot = await this.lots.findById(line.stockLotId);
      if (lot === null) continue;
      // Lines are consolidated per lot, so at most one DELIVERY_OUT per lot
      // belongs to this delivery; match it to credit exactly once.
      const originals = await this.movements.listByItem(lot.itemId);
      const original = originals.find((movement) => movement.type === "DELIVERY_OUT" && movement.lotId === lot.id && movement.quantity === line.quantity);
      if (original === undefined) continue;
      movements.push(
        StockMovement.create({
          itemId: lot.itemId,
          unitId: line.unitId,
          lotId: lot.id,
          type: "DELIVERY_REVERSAL",
          quantity: line.quantity,
          occurredAt: reversedAt,
          recordedBy: input.actorId,
          reason: input.reason.trim(),
          reversesMovementId: original.id,
        }),
      );
    }
    const { record } = found;
    const before = { status: record.status, revision: record.revision };
    record.markReversed();
    delivery.markReversed();
    await this.deliveries.reverseFull(
      { delivery, record, reversal, movements },
      {
        performedBy: input.actorId,
        before,
        after: { status: record.status, revision: record.revision },
        reason: input.reason.trim(),
      },
    );
    return { reversalId: reversal.id, duplicate: false };
  }
}

