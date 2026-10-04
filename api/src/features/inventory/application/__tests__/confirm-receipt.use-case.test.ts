import { describe, expect, it } from "vitest";
import { Category } from "../../domain/entities/category.entity.js";
import { Item } from "../../domain/entities/item.entity.js";
import { ReceiptLine } from "../../domain/entities/receipt-line.entity.js";
import { StockLot } from "../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../domain/entities/stock-movement.entity.js";
import { StockReceipt } from "../../domain/entities/stock-receipt.entity.js";
import { ReceiptOperationConflictError } from "../../domain/errors/receipt-operation-conflict.error.js";
import { Unit } from "../../domain/entities/unit.entity.js";
import { DecimalPlaces } from "../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../domain/value-objects/quantity-increment.value-object.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { ItemRepository } from "../../domain/repositories/item.repository.js";
import type { LotRepository } from "../../domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../domain/repositories/movement.repository.js";
import type { ReceiptFilters, ReceiptRepository } from "../../domain/repositories/receipt.repository.js";
import type { UnitRepository } from "../../domain/repositories/unit.repository.js";
import { ConfirmStockReceiptUseCase } from "../use-cases/confirm-receipt/confirm-receipt.use-case.js";

class FakeReceipts implements ReceiptRepository {
  readonly receipts = new Map<string, StockReceipt>();

  async saveFull(receipt: StockReceipt): Promise<void> {
    this.receipts.set(receipt.operationKey, receipt);
  }

  async findById(): Promise<StockReceipt | null> {
    return null;
  }

  async findByOperationKey(key: string): Promise<StockReceipt | null> {
    return this.receipts.get(key) ?? null;
  }

  async findLinesByReceiptId(): Promise<ReceiptLine[]> {
    return [];
  }

  async list(): Promise<StockReceipt[]> {
    return [];
  }

  filters?: ReceiptFilters;
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
    return [this.item];
  }
}

class FakeUnits implements UnitRepository {
  constructor(readonly unit: Unit) {}

  async save(): Promise<void> {}

  async findById(): Promise<Unit | null> {
    return this.unit;
  }

  async findBySymbol(): Promise<Unit | null> {
    return this.unit;
  }

  async listAll(): Promise<Unit[]> {
    return [this.unit];
  }
}

void Category;
type Unused = CategoryRepository | LotRepository | MovementRepository | StockLot | StockMovement;
void (null as unknown as Unused);

function setup(requiresExpiration: boolean) {
  const category = Category.create({ name: "Alimentos" });
  const unit = Unit.create({ symbol: "KG", name: "Quilograma", decimalPlaces: DecimalPlaces.of(3), quantityIncrement: QuantityIncrement.of(0.1) });
  const item = Item.create({ categoryId: category.id, unitId: unit.id, name: "Arroz 1kg", requiresExpiration });
  const receipts = new FakeReceipts();
  const useCase = new ConfirmStockReceiptUseCase(receipts, new FakeItems(item), new FakeUnits(unit));
  return { receipts, useCase, item };
}

const LINES = [{ itemId: "item", receivedQuantity: 9, acceptedQuantity: 9, rejectedQuantity: 0, expiresOn: "2026-01-15" }];

describe("ConfirmStockReceiptUseCase", () => {
  it("confirms receipt with lines, lots and movements", async () => {
    const { receipts, useCase, item } = setup(true);
    const output = await useCase.execute({
      originType: "PERSON",
      receivedAt: "2024-01-15",
      operationKey: "11111111-1111-1111-1111-111111111111",
      actorId: "op",
      lines: [{ ...LINES[0], itemId: item.id }],
    });
    expect(output.duplicate).toBe(false);
    expect(receipts.receipts.size).toBe(1);
  });

  it("same operationKey with same content returns duplicate", async () => {
    const { useCase, item } = setup(true);
    const input = {
      originType: "PERSON" as const,
      receivedAt: "2024-01-15",
      operationKey: "22222222-2222-2222-2222-222222222222",
      actorId: "op",
      lines: [{ ...LINES[0], itemId: item.id }],
    };
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);
    expect(first.receiptId).toBe(second.receiptId);
    expect(second.duplicate).toBe(true);
  });

  it("same operationKey with different content conflicts", async () => {
    const { useCase, item } = setup(true);
    const base = { originType: "PERSON" as const, receivedAt: "2024-01-15", actorId: "op", lines: [{ ...LINES[0], itemId: item.id }] };
    await useCase.execute({ ...base, operationKey: "33333333-3333-3333-3333-333333333333" });
    await expect(
      useCase.execute({ ...base, operationKey: "33333333-3333-3333-3333-333333333333", note: "different" }),
    ).rejects.toThrow(ReceiptOperationConflictError);
  });
});
