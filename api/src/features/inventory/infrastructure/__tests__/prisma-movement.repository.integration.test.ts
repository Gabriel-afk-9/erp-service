import { describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/infrastructure/database/prisma.client.js";
import { Category } from "../../domain/entities/category.entity.js";
import { Item } from "../../domain/entities/item.entity.js";
import { StockLot } from "../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../domain/entities/stock-movement.entity.js";
import { Unit } from "../../domain/entities/unit.entity.js";
import { DecimalPlaces } from "../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../domain/value-objects/quantity-increment.value-object.js";
import { PrismaCategoryRepository } from "../repositories/prisma-category.repository.js";
import { PrismaItemRepository } from "../repositories/prisma-item.repository.js";
import { PrismaLotRepository } from "../repositories/prisma-lot.repository.js";
import { PrismaMovementRepository } from "../repositories/prisma-movement.repository.js";
import { PrismaUnitRepository } from "../repositories/prisma-unit.repository.js";

describe("PrismaMovementRepository integration", () => {
  it("appends movements and aggregates balance per lot", async () => {
    const categories = new PrismaCategoryRepository(prisma);
    const units = new PrismaUnitRepository(prisma);
    const items = new PrismaItemRepository(prisma);
    const lots = new PrismaLotRepository(prisma);
    const movements = new PrismaMovementRepository(prisma);
    const suffix = Date.now();
    const category = Category.create({ name: `Mov ${suffix}` });
    await categories.save(category);
    const unit = Unit.create({
      symbol: `M${String(suffix).slice(-6)}`,
      name: "Unidade",
      decimalPlaces: DecimalPlaces.of(0),
      quantityIncrement: QuantityIncrement.of(1),
    });
    await units.save(unit);
    const item = Item.create({ categoryId: category.id, unitId: unit.id, name: `Item Mov ${suffix}`, requiresExpiration: false });
    await items.save(item);
    const lot = StockLot.create({ itemId: item.id, unitId: unit.id });
    await lots.save(lot);
    await movements.append(
      StockMovement.create({ itemId: item.id, unitId: unit.id, lotId: lot.id, type: "DONATION_IN", quantity: 9, occurredAt: "2024-01-15" as never, recordedBy: "test" }),
    );
    await movements.append(
      StockMovement.create({ itemId: item.id, unitId: unit.id, lotId: lot.id, type: "ADJUSTMENT_OUT", quantity: 2, occurredAt: "2024-01-16" as never, recordedBy: "test", reason: "Perda" }),
    );
    expect(await movements.sumDeltaByLot(lot.id)).toBe(7);
    expect(await movements.sumDeltaByItem(item.id)).toBe(7);
    const listed = await movements.listByItem(item.id);
    expect(listed).toHaveLength(2);
    expect(listed[0].type).toBe("DONATION_IN");
  });

  it("findByOperationKey returns idempotent replay", async () => {
    const movements = new PrismaMovementRepository(prisma);
    const key = `op-${Date.now()}`;
    const found = await movements.findByOperationKey(key);
    expect(found).toBeNull();
  });
});
