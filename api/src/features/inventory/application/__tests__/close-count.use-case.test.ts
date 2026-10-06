import { describe, expect, it } from "vitest";
import { Category } from "../../domain/entities/category.entity.js";
import { Item } from "../../domain/entities/item.entity.js";
import { StockCount, StockCountLine } from "../../domain/entities/stock-count.entity.js";
import { StockLot } from "../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../domain/entities/stock-movement.entity.js";
import { Unit } from "../../domain/entities/unit.entity.js";
import type { CountRepository } from "../../domain/repositories/count.repository.js";
import type { ItemRepository } from "../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../domain/repositories/movement.repository.js";
import { DecimalPlaces } from "../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../domain/value-objects/quantity-increment.value-object.js";
import { CloseStockCountUseCase } from "../use-cases/close-count/close-count.use-case.js";

class FakeCounts implements CountRepository {
  count: StockCount | null = null;
  lines: StockCountLine[] = [];

  async saveCount(count: StockCount): Promise<void> {
    this.count = count;
  }

  async saveLine(line: StockCountLine): Promise<void> {
    this.lines.push(line);
  }

  async updateLine(): Promise<void> {}

  async findCountById(): Promise<StockCount | null> {
    return this.count;
  }

  async findLinesByCountId(): Promise<StockCountLine[]> {
    return this.lines;
  }

  async findLineByLot(): Promise<null> {
    return null;
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

  async findByItem(): Promise<StockLot[]> {
    return [];
  }

  async listAll(): Promise<StockLot[]> {
    return [];
  }
}

class FakeMovements implements MovementRepository {
  readonly appended: StockMovement[] = [];

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
    return 0;
  }

  async sumDeltaByLot(): Promise<number> {
    return 0;
  }

  async listByItem(): Promise<StockMovement[]> {
    return [];
  }
}

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

describe("CloseStockCountUseCase", () => {
  it("generates ADJUSTMENT_OUT for negative variance on a lot", async () => {
    const category = Category.create({ name: "Alimentos" });
    const unit = Unit.create({ symbol: "KG", name: "Quilograma", decimalPlaces: DecimalPlaces.of(0), quantityIncrement: QuantityIncrement.of(1) });
    const item = Item.create({ categoryId: category.id, unitId: unit.id, name: "Arroz 1kg", requiresExpiration: false });
    const counts = new FakeCounts();
    const movements = new FakeMovements();
    const count = StockCount.create({ conductedBy: "op", conductedAt: "2024-01-20" as never });
    await counts.saveCount(count);
    await counts.saveLine(
      StockCountLine.create({ countId: count.id, itemId: item.id, unitId: unit.id, lotId: "lot-1", expectedQuantity: 9, countedQuantity: 7 }),
    );
    const useCase = new CloseStockCountUseCase(counts, new FakeLots(), movements, new FakeItems(item));
    const output = await useCase.execute({ countId: count.id, actorId: "op" });
    expect(output.adjustments).toBe(1);
    expect(movements.appended[0].type).toBe("ADJUSTMENT_OUT");
    expect(movements.appended[0].quantity).toBe(2);
  });

  it("generates OPENING_BALANCE for first positive variance without a lot", async () => {
    const category = Category.create({ name: "Alimentos" });
    const unit = Unit.create({ symbol: "UN", name: "Unidade", decimalPlaces: DecimalPlaces.of(0), quantityIncrement: QuantityIncrement.of(1) });
    const item = Item.create({ categoryId: category.id, unitId: unit.id, name: "Sabonete", requiresExpiration: false });
    const counts = new FakeCounts();
    const movements = new FakeMovements();
    movements.hasOpeningBalance = async () => false;
    const count = StockCount.create({ conductedBy: "op", conductedAt: "2024-01-20" as never });
    await counts.saveCount(count);
    await counts.saveLine(
      StockCountLine.create({ countId: count.id, itemId: item.id, unitId: unit.id, expectedQuantity: 0, countedQuantity: 5 }),
    );
    const useCase = new CloseStockCountUseCase(counts, new FakeLots(), movements, new FakeItems(item));
    await useCase.execute({ countId: count.id, actorId: "op" });
    expect(movements.appended[0].type).toBe("OPENING_BALANCE");
  });
});
