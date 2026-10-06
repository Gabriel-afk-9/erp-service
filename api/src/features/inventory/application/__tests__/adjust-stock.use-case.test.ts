import { describe, expect, it } from "vitest";
import { Category } from "../../domain/entities/category.entity.js";
import { Item } from "../../domain/entities/item.entity.js";
import { StockMovement } from "../../domain/entities/stock-movement.entity.js";
import { Unit } from "../../domain/entities/unit.entity.js";
import { NegativeBalanceBlockedError } from "../../domain/errors/negative-balance-blocked.error.js";
import type { ItemRepository } from "../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../domain/repositories/movement.repository.js";
import { DecimalPlaces } from "../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../domain/value-objects/quantity-increment.value-object.js";
import { AdjustStockUseCase } from "../use-cases/adjust-stock/adjust-stock.use-case.js";

class FakeItems implements ItemRepository {
  constructor(readonly item: Item) {}

  async save(): Promise<void> {}

  async findById(): Promise<Item | null> {
    return this.item;
  }

  async findByCategoryAndName(): Promise<Item | null> {
    return null;
  }

  async findByQuery(): Promise<Item[]> {
    return [];
  }
}

class FakeLots implements LotRepository {
  async save(): Promise<void> {}

  async findById(): Promise<null> {
    return null;
  }

  async findByReceiptLineId(): Promise<null> {
    return null;
  }

  async findByItem(): Promise<[]> {
    return [];
  }

  async listAll(): Promise<[]> {
    return [];
  }
}

class FakeMovements implements MovementRepository {
  readonly appended: StockMovement[] = [];
  balance = 9;

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
    return this.balance;
  }

  async sumDeltaByLot(): Promise<number> {
    return 0;
  }

  async listByItem(): Promise<StockMovement[]> {
    return [];
  }
}

function setup() {
  const category = Category.create({ name: "Alimentos" });
  const unit = Unit.create({ symbol: "KG", name: "Quilograma", decimalPlaces: DecimalPlaces.of(3), quantityIncrement: QuantityIncrement.of(0.1) });
  const item = Item.create({ categoryId: category.id, unitId: unit.id, name: "Arroz 1kg", requiresExpiration: true });
  const movements = new FakeMovements();
  const useCase = new AdjustStockUseCase(new FakeItems(item), new FakeLots(), movements);
  return { useCase, movements, item };
}

describe("AdjustStockUseCase", () => {
  it("applies IN adjustment with operationKey", async () => {
    const { useCase, movements } = setup();
    const output = await useCase.execute({
      itemId: "item",
      quantity: 2,
      direction: "IN",
      reason: "Sobras",
      operationKey: "44444444-4444-4444-4444-444444444444",
      actorId: "op",
    });
    expect(output.duplicate).toBe(false);
    expect(movements.appended).toHaveLength(1);
    expect(movements.appended[0].type).toBe("ADJUSTMENT_IN");
  });

  it("blocks OUT beyond on-hand balance", async () => {
    const { useCase, item } = setup();
    await expect(
      useCase.execute({
        itemId: item.id,
        quantity: 99,
        direction: "OUT",
        reason: "Perda total",
        operationKey: "55555555-5555-5555-5555-555555555555",
        actorId: "op",
      }),
    ).rejects.toThrow(NegativeBalanceBlockedError);
  });
});
