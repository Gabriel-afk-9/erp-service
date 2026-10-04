import { describe, expect, it } from "vitest";
import { ServiceRecord } from "../../../atd/domain/entities/service-record.entity.js";
import { createExecutorInfo } from "../../../atd/domain/value-objects/executor-info.value-object.js";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { Instant } from "../../../../shared/domain/value-objects/instant.value-object.js";
import { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { ServiceRecordRepository } from "../../../atd/domain/repositories/service-record.repository.js";
import { Category } from "../../../inventory/domain/entities/category.entity.js";
import { Item } from "../../../inventory/domain/entities/item.entity.js";
import { StockLot } from "../../../inventory/domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../../inventory/domain/entities/stock-movement.entity.js";
import { Unit } from "../../../inventory/domain/entities/unit.entity.js";
import type { LotRepository } from "../../../inventory/domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../../inventory/domain/repositories/movement.repository.js";
import { DecimalPlaces } from "../../../inventory/domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../../inventory/domain/value-objects/quantity-increment.value-object.js";
import { Delivery } from "../../domain/entities/delivery.entity.js";
import { DeliveryLine } from "../../domain/entities/delivery-line.entity.js";
import { DeliveryReversal } from "../../domain/entities/delivery-reversal.entity.js";
import type { DeliveryRepository } from "../../domain/repositories/delivery.repository.js";
import { ReverseDeliveryUseCase } from "../use-cases/reverse-delivery/reverse-delivery.use-case.js";

class FakeDeliveries implements DeliveryRepository {
  constructor(readonly delivery: Delivery, readonly line: DeliveryLine) {}
  reversed: Delivery | null = null;
  reversal: DeliveryReversal | null = null;
  sink: { append(m: never): Promise<void> } | null = null;

  async findById(): Promise<Delivery | null> {
    return this.delivery;
  }

  async findByOperationKey(): Promise<null> {
    return null;
  }

  async findByServiceRecordId(): Promise<null> {
    return null;
  }

  async findLinesByDeliveryId(): Promise<DeliveryLine[]> {
    return [this.line];
  }

  async findReversalByDeliveryId(): Promise<DeliveryReversal | null> {
    return this.reversal;
  }

  async list(): Promise<Delivery[]> {
    return [];
  }

  async confirmFull(): Promise<void> {}

  async reverseFull(bundle: { delivery: Delivery; reversal: DeliveryReversal; movements: { id: string }[] }): Promise<void> {
    this.reversed = bundle.delivery;
    this.reversal = bundle.reversal;
    if (this.sink !== null) {
      for (const movement of bundle.movements) {
        await this.sink.append(movement as never);
      }
    }
  }
}

class FakeServiceRecords implements ServiceRecordRepository {
  constructor(readonly record: ServiceRecord) {}

  async save(): Promise<void> {}

  async findById() {
    return { record: this.record, homeVisit: null };
  }

  async findByFamily() {
    return [];
  }
}

class FakeLots implements LotRepository {
  constructor(readonly lot: StockLot) {}

  async save(): Promise<void> {}

  async findById(): Promise<StockLot | null> {
    return this.lot;
  }

  async findByReceiptLineId(): Promise<null> {
    return null;
  }

  async findByItem(): Promise<StockLot[]> {
    return [];
  }

  async listAll(): Promise<StockLot[]> {
    return [];
  }
}

class FakeMovements implements MovementRepository {
  readonly appended: StockMovement[] = [];
  constructor(readonly outflow: StockMovement) {}

  async append(movement: StockMovement): Promise<void> {
    this.appended.push(movement);
  }

  async findByOperationKey(): Promise<null> {
    return null;
  }

  async hasOpeningBalance(): Promise<boolean> {
    return true;
  }

  async sumDeltaByItem(): Promise<number> {
    return 3;
  }

  async sumDeltaByLot(): Promise<number> {
    return 3;
  }

  async listByItem(): Promise<StockMovement[]> {
    return [this.outflow];
  }
}

function setup() {
  const category = Category.create({ name: "Alimentos" });
  const unit = Unit.create({ symbol: "KG", name: "Quilograma", decimalPlaces: DecimalPlaces.of(0), quantityIncrement: QuantityIncrement.of(1) });
  const item = Item.create({ categoryId: category.id, unitId: unit.id, name: "Arroz 1kg", requiresExpiration: false });
  const lot = StockLot.create({ itemId: item.id, unitId: unit.id });
  const record = ServiceRecord.create({
    id: Id.generate(),
    activityId: "act-donation",
    serviceTypeId: "st-donation",
    serviceTypeName: "Doacao de itens",
    familyId: "fam-1",
    personId: null,
    membershipId: null,
    executor: createExecutorInfo("Joana", "Assistente"),
    occurredAt: CivilDate.from("2024-03-01"),
    recordedAt: Instant.now(),
    recordedBy: "op",
    note: null,
  });
  const delivery = Delivery.create({
    serviceRecordId: record.id,
    familyId: "fam-1",
    assessmentId: "as-1",
    eligibilityStatus: "PENDING",
    occurredAt: CivilDate.from("2024-03-01"),
    executorName: "Joana",
    executorRole: "Assistente",
    exceptionReason: "Vulneravel",
    authorizedBy: "Coord",
    operationKey: "99999999-9999-9999-9999-999999999999",
    fingerprint: "fp",
  });
  const line = DeliveryLine.create({ deliveryId: delivery.id, stockLotId: lot.id, unitId: unit.id, quantity: 2 });
  const outflow = StockMovement.create({
    itemId: item.id,
    unitId: unit.id,
    lotId: lot.id,
    type: "DELIVERY_OUT",
    quantity: 2,
    occurredAt: CivilDate.from("2024-03-01"),
    recordedBy: "op",
  });
  const deliveries = new FakeDeliveries(delivery, line);
  const movements = new FakeMovements(outflow);
  deliveries.sink = movements;
  const useCase = new ReverseDeliveryUseCase(deliveries, new FakeServiceRecords(record), new FakeLots(lot), movements);
  return { deliveries, movements, useCase, delivery, record };
}

describe("ReverseDeliveryUseCase", () => {
  it("reverses integraly and marks delivery and record REVERSED", async () => {
    const { movements, useCase, delivery, record } = setup();
    const output = await useCase.execute({ deliveryId: delivery.id, reason: "Lancamento em duplicidade", actorId: "op" });
    expect(output.duplicate).toBe(false);
    expect(movements.appended).toHaveLength(1);
    expect(movements.appended[0].type).toBe("DELIVERY_REVERSAL");
    expect(movements.appended[0].reversesMovementId).toBeTruthy();
    expect(delivery.status).toBe("REVERSED");
    expect(record.status).toBe("REVERSED");
  });

  it("second reversal returns duplicate without new credit", async () => {
    const { movements, useCase, delivery } = setup();
    await useCase.execute({ deliveryId: delivery.id, reason: "Engano", actorId: "op" });
    const second = await useCase.execute({ deliveryId: delivery.id, reason: "Engano de novo", actorId: "op" });
    expect(second.duplicate).toBe(true);
    expect(movements.appended).toHaveLength(1);
  });
});

