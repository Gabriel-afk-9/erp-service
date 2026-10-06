import { describe, expect, it } from "vitest";
import { BazarTransfer } from "../../domain/entities/bazar-transfer.entity.js";
import { Category } from "../../domain/entities/category.entity.js";
import { Item } from "../../domain/entities/item.entity.js";
import { ReceiptLine } from "../../domain/entities/receipt-line.entity.js";
import { StockLot } from "../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../domain/entities/stock-movement.entity.js";
import { StockReceipt } from "../../domain/entities/stock-receipt.entity.js";
import { Unit } from "../../domain/entities/unit.entity.js";
import { ReceiptOperationConflictError } from "../../domain/errors/receipt-operation-conflict.error.js";
import type { BazarTransferFilters, BazarTransferRepository } from "../../domain/repositories/bazar-transfer.repository.js";
import type { ItemRepository } from "../../domain/repositories/item.repository.js";
import type { ReceiptFilters, ReceiptRepository } from "../../domain/repositories/receipt.repository.js";
import type { UnitRepository } from "../../domain/repositories/unit.repository.js";
import { DecimalPlaces } from "../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../domain/value-objects/quantity-increment.value-object.js";
import { RegisterBazarTransferUseCase } from "../use-cases/register-bazar-transfer/register-bazar-transfer.use-case.js";

class FakeTransfers implements BazarTransferRepository {
  readonly byReference = new Map<string, BazarTransfer>();
  saved = 0;

  constructor(private readonly receipts: FakeReceipts) {}

  async saveFull(transfer: BazarTransfer, receipt: StockReceipt): Promise<void> {
    this.byReference.set(transfer.externalReference, transfer);
    this.receipts.byKey.set(receipt.operationKey, receipt);
    this.saved += 1;
  }

  async findById(): Promise<null> {
    return null;
  }

  async findByExternalReference(reference: string): Promise<BazarTransfer | null> {
    return this.byReference.get(reference) ?? null;
  }

  async findReceiptByTransferId(): Promise<null> {
    return null;
  }

  async list(_filters: BazarTransferFilters): Promise<BazarTransfer[]> {
    void _filters;
    return [...this.byReference.values()];
  }
}

class FakeReceipts implements ReceiptRepository {
  readonly byKey = new Map<string, StockReceipt>();

  async saveFull(): Promise<void> {}

  async findById(): Promise<null> {
    return null;
  }

  async findByOperationKey(key: string): Promise<StockReceipt | null> {
    return this.byKey.get(key) ?? null;
  }

  async findLinesByReceiptId(): Promise<ReceiptLine[]> {
    return [];
  }

  async list(_filters: ReceiptFilters): Promise<StockReceipt[]> {
    void _filters;
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

class FakeUnits implements UnitRepository {
  constructor(readonly unit: Unit) {}

  async save(): Promise<void> {}

  async findById(): Promise<Unit | null> {
    return this.unit;
  }

  async findBySymbol(): Promise<Unit | null> {
    return null;
  }

  async listAll(): Promise<Unit[]> {
    return [];
  }
}

void StockLot;
void StockMovement;
void StockReceipt;

function setup() {
  const category = Category.create({ name: "Alimentos" });
  const unit = Unit.create({ symbol: "KG", name: "Quilograma", decimalPlaces: DecimalPlaces.of(0), quantityIncrement: QuantityIncrement.of(1) });
  const item = Item.create({ categoryId: category.id, unitId: unit.id, name: "Arroz 1kg", requiresExpiration: false });
  const receipts = new FakeReceipts();
  const transfers = new FakeTransfers(receipts);
  const useCase = new RegisterBazarTransferUseCase(transfers, receipts, new FakeItems(item), new FakeUnits(unit));
  const input = {
    externalReference: "BAZ-2024-0001",
    receivedAt: "2024-02-01",
    operationKey: "66666666-6666-6666-6666-666666666666",
    actorId: "op",
    lines: [{ itemId: item.id, informedQuantity: 10, receivedQuantity: 8, acceptedQuantity: 8, rejectedQuantity: 0 }],
  };
  return { transfers, useCase, input };
}

describe("RegisterBazarTransferUseCase", () => {
  it("registers transfer with BAZAR_IN movement", async () => {
    const { useCase } = setup();
    const { input } = setup();
    const output = await useCase.execute(input);
    expect(output.duplicate).toBe(false);
    expect(output.transferId).toBeTruthy();
  });

  it("same reference returns duplicate without creating", async () => {
    const { transfers, useCase, input } = setup();
    const first = await useCase.execute(input);
    const second = await useCase.execute({ ...input, operationKey: "77777777-7777-7777-7777-777777777777" });
    expect(second.duplicate).toBe(true);
    expect(second.transferId).toBe(first.transferId);
    expect(transfers.saved).toBe(1);
  });

  it("same operationKey with different content conflicts", async () => {
    const { useCase, input } = setup();
    await useCase.execute(input);
    await expect(
      useCase.execute({ ...input, externalReference: "BAZ-2024-0002", donorName: "other" }),
    ).rejects.toThrow(ReceiptOperationConflictError);
  });
});
