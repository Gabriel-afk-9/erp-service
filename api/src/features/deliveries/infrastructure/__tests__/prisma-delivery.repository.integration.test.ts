import { describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/infrastructure/database/prisma.client.js";
import { Category } from "../../../inventory/domain/entities/category.entity.js";
import { Item } from "../../../inventory/domain/entities/item.entity.js";
import { StockLot } from "../../../inventory/domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../../inventory/domain/entities/stock-movement.entity.js";
import { Unit } from "../../../inventory/domain/entities/unit.entity.js";
import { DecimalPlaces } from "../../../inventory/domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../../inventory/domain/value-objects/quantity-increment.value-object.js";
import { PrismaCategoryRepository } from "../../../inventory/infrastructure/repositories/prisma-category.repository.js";
import { PrismaItemRepository } from "../../../inventory/infrastructure/repositories/prisma-item.repository.js";
import { PrismaLotRepository } from "../../../inventory/infrastructure/repositories/prisma-lot.repository.js";
import { PrismaMovementRepository } from "../../../inventory/infrastructure/repositories/prisma-movement.repository.js";
import { PrismaUnitRepository } from "../../../inventory/infrastructure/repositories/prisma-unit.repository.js";
import { ServiceRecord } from "../../../atd/domain/entities/service-record.entity.js";
import { createExecutorInfo } from "../../../atd/domain/value-objects/executor-info.value-object.js";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { Instant } from "../../../../shared/domain/value-objects/instant.value-object.js";
import { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Delivery } from "../../domain/entities/delivery.entity.js";
import { DeliveryLine } from "../../domain/entities/delivery-line.entity.js";
import { PrismaDeliveryRepository } from "../repositories/prisma-delivery.repository.js";

describe("PrismaDeliveryRepository integration", () => {
  it("confirms delivery with service record and outflows atomically", async () => {
    const categories = new PrismaCategoryRepository(prisma);
    const units = new PrismaUnitRepository(prisma);
    const items = new PrismaItemRepository(prisma);
    const lots = new PrismaLotRepository(prisma);
    const movements = new PrismaMovementRepository(prisma);
    const deliveries = new PrismaDeliveryRepository(prisma);
    const suffix = Date.now();
    const category = Category.create({ name: `Ent ${suffix}` });
    await categories.save(category);
    const unit = Unit.create({
      symbol: `E${String(suffix).slice(-6)}`,
      name: "Unidade",
      decimalPlaces: DecimalPlaces.of(0),
      quantityIncrement: QuantityIncrement.of(1),
    });
    await units.save(unit);
    const item = Item.create({ categoryId: category.id, unitId: unit.id, name: `Item Ent ${suffix}`, requiresExpiration: false });
    await items.save(item);
    const lot = StockLot.create({ itemId: item.id, unitId: unit.id });
    await lots.save(lot);
    await movements.append(
      StockMovement.create({ itemId: item.id, unitId: unit.id, lotId: lot.id, type: "DONATION_IN", quantity: 5, occurredAt: "2024-03-01" as never, recordedBy: "test" }),
    );
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
      recordedBy: "test",
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
      operationKey: `delivery-${suffix}`,
      fingerprint: "test",
    });
    const line = DeliveryLine.create({ deliveryId: delivery.id, stockLotId: lot.id, unitId: unit.id, quantity: 2 });
    const outflow = StockMovement.create({
      itemId: item.id,
      unitId: unit.id,
      lotId: lot.id,
      type: "DELIVERY_OUT",
      quantity: 2,
      occurredAt: CivilDate.from("2024-03-01"),
      recordedBy: "test",
    });
    await deliveries.confirmFull(
      { record, delivery, lines: [line], movements: [outflow] },
      { performedBy: "test", before: null, after: { status: "COMPLETED", revision: 1 }, reason: null },
    );
    expect(await movements.sumDeltaByLot(lot.id)).toBe(3);
    const stored = await deliveries.findByOperationKey(`delivery-${suffix}`);
    expect(stored?.serviceRecordId).toBe(record.id);
  });
});
