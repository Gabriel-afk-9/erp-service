import { describe, expect, it } from "vitest";
import { Category } from "../../domain/entities/category.entity.js";
import { Item } from "../../domain/entities/item.entity.js";
import { Unit } from "../../domain/entities/unit.entity.js";
import { CategoryInactiveError } from "../../domain/errors/category-inactive.error.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { ItemNameAlreadyExistsInCategoryError } from "../../domain/errors/item-name-already-exists-in-category.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { ItemQueryFilters, ItemRepository } from "../../domain/repositories/item.repository.js";
import type { UnitRepository } from "../../domain/repositories/unit.repository.js";
import { DecimalPlaces } from "../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../domain/value-objects/quantity-increment.value-object.js";
import { CreateItemUseCase } from "../use-cases/create-item/create-item.use-case.js";

class InMemoryCategories implements CategoryRepository {
  readonly store = new Map<string, Category>();

  async save(category: Category): Promise<void> {
    this.store.set(category.id, category);
  }

  async findById(id: string): Promise<Category | null> {
    return this.store.get(id) ?? null;
  }

  async findByName(): Promise<Category | null> {
    return null;
  }

  async findByQuery(): Promise<Category[]> {
    return [...this.store.values()];
  }
}

class InMemoryUnits implements UnitRepository {
  readonly store = new Map<string, Unit>();

  async save(unit: Unit): Promise<void> {
    this.store.set(unit.id, unit);
  }

  async findById(id: string): Promise<Unit | null> {
    return this.store.get(id) ?? null;
  }

  async findBySymbol(): Promise<Unit | null> {
    return null;
  }

  async listAll(): Promise<Unit[]> {
    return [...this.store.values()];
  }
}

class InMemoryItems implements ItemRepository {
  readonly store = new Map<string, Item>();

  async save(item: Item): Promise<void> {
    this.store.set(item.id, item);
  }

  async findById(id: string): Promise<Item | null> {
    return this.store.get(id) ?? null;
  }

  async findByCategoryAndName(categoryId: string, name: string): Promise<Item | null> {
    for (const item of this.store.values()) {
      if (item.categoryId === categoryId && item.name.toLowerCase() === name.toLowerCase()) return item;
    }
    return null;
  }

  async findByQuery(): Promise<Item[]> {
    return [...this.store.values()];
  }
}

async function setup() {
  const categories = new InMemoryCategories();
  const units = new InMemoryUnits();
  const items = new InMemoryItems();
  const category = Category.create({ name: "Alimentos" });
  await categories.save(category);
  const unit = Unit.create({ symbol: "KG", name: "Quilograma", decimalPlaces: DecimalPlaces.of(3), quantityIncrement: QuantityIncrement.of(0.1) });
  await units.save(unit);
  const useCase = new CreateItemUseCase(items, categories, units);
  return { categories, units, items, category, unit, useCase };
}

describe("CreateItemUseCase", () => {
  it("creates item with requiresExpiration true", async () => {
    const { category, unit, useCase } = await setup();
    const output = await useCase.execute({ categoryId: category.id, unitId: unit.id, name: "Arroz 1kg", requiresExpiration: true });
    expect(output.name).toBe("Arroz 1kg");
  });

  it("creates item with requiresExpiration false", async () => {
    const { category, unit, useCase } = await setup();
    const output = await useCase.execute({ categoryId: category.id, unitId: unit.id, name: "Sabonete", requiresExpiration: false });
    expect(output.name).toBe("Sabonete");
  });

  it("unknown category throws CategoryNotFoundError", async () => {
    const { unit, useCase } = await setup();
    await expect(
      useCase.execute({ categoryId: "00000000-0000-0000-0000-000000000000", unitId: unit.id, name: "X", requiresExpiration: false }),
    ).rejects.toThrow(CategoryNotFoundError);
  });

  it("inactive category throws CategoryInactiveError", async () => {
    const { categories, category, unit, useCase } = await setup();
    category.deactivate();
    await categories.save(category);
    await expect(
      useCase.execute({ categoryId: category.id, unitId: unit.id, name: "Feijão", requiresExpiration: true }),
    ).rejects.toThrow(CategoryInactiveError);
  });

  it("duplicate name in category throws ItemNameAlreadyExistsInCategoryError", async () => {
    const { category, unit, useCase } = await setup();
    await useCase.execute({ categoryId: category.id, unitId: unit.id, name: "Arroz 1kg", requiresExpiration: true });
    await expect(
      useCase.execute({ categoryId: category.id, unitId: unit.id, name: "Arroz 1kg", requiresExpiration: true }),
    ).rejects.toThrow(ItemNameAlreadyExistsInCategoryError);
  });

  it("filters type is importable", () => {
    const filters: ItemQueryFilters = { onlyActive: true };
    expect(filters.onlyActive).toBe(true);
  });
});
