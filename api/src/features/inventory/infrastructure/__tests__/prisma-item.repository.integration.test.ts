import { describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/infrastructure/database/prisma.client.js";
import { Category } from "../../domain/entities/category.entity.js";
import { Unit } from "../../domain/entities/unit.entity.js";
import { Item } from "../../domain/entities/item.entity.js";
import { DecimalPlaces } from "../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../domain/value-objects/quantity-increment.value-object.js";
import { PrismaCategoryRepository } from "../repositories/prisma-category.repository.js";
import { PrismaItemRepository } from "../repositories/prisma-item.repository.js";
import { PrismaUnitRepository } from "../repositories/prisma-unit.repository.js";

describe("PrismaItemRepository integration", () => {
  it("findByCategoryAndName respects uniqueness within category", async () => {
    const categories = new PrismaCategoryRepository(prisma);
    const units = new PrismaUnitRepository(prisma);
    const items = new PrismaItemRepository(prisma);
    const suffix = Date.now();
    const category = Category.create({ name: `Cat ${suffix}` });
    await categories.save(category);
    const unit = Unit.create({
      symbol: `U${String(suffix).slice(-6)}`,
      name: "Unidade",
      decimalPlaces: DecimalPlaces.of(0),
      quantityIncrement: QuantityIncrement.of(1),
    });
    await units.save(unit);
    const item = Item.create({ categoryId: category.id, unitId: unit.id, name: `Item ${suffix}`, requiresExpiration: false });
    await items.save(item);
    const found = await items.findByCategoryAndName(category.id, `item ${suffix}`);
    expect(found?.id).toBe(item.id);
  });

  it("findByQuery filters by categoryId", async () => {
    const items = new PrismaItemRepository(prisma);
    const found = await items.findByQuery("", { categoryId: "00000000-0000-0000-0000-000000000000" });
    expect(found).toEqual([]);
  });
});
