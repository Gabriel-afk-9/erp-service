import { describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/infrastructure/database/prisma.client.js";
import { Category } from "../../domain/entities/category.entity.js";
import { Item } from "../../domain/entities/item.entity.js";
import { ReceiptLine } from "../../domain/entities/receipt-line.entity.js";
import { StockLot } from "../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../domain/entities/stock-movement.entity.js";
import { StockReceipt } from "../../domain/entities/stock-receipt.entity.js";
import { Unit } from "../../domain/entities/unit.entity.js";
import { DecimalPlaces } from "../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../domain/value-objects/quantity-increment.value-object.js";
import { PrismaCategoryRepository } from "../repositories/prisma-category.repository.js";
import { PrismaItemRepository } from "../repositories/prisma-item.repository.js";
import { PrismaReceiptRepository } from "../repositories/prisma-receipt.repository.js";
import { PrismaUnitRepository } from "../repositories/prisma-unit.repository.js";

describe("PrismaReceiptRepository integration", () => {
  it("saves receipt with lines, lots and movements atomically", async () => {
    const categories = new PrismaCategoryRepository(prisma);
    const units = new PrismaUnitRepository(prisma);
    const items = new PrismaItemRepository(prisma);
    const receipts = new PrismaReceiptRepository(prisma);
    const suffix = Date.now();
    const category = Category.create({ name: `Rec ${suffix}` });
    await categories.save(category);
    const unit = Unit.create({
      symbol: `R${String(suffix).slice(-6)}`,
      name: "Unidade",
      decimalPlaces: DecimalPlaces.of(0),
      quantityIncrement: QuantityIncrement.of(1),
    });
    await units.save(unit);
    const item = Item.create({ categoryId: category.id, unitId: unit.id, name: `Item Rec ${suffix}`, requiresExpiration: false });
    await items.save(item);
    const receipt = StockReceipt.create({
      originType: "PERSON",
      receivedBy: "test",
      receivedAt: "2024-01-15" as never,
      operationKey: `receipt-${suffix}`,
      fingerprint: "test",
    });
    const line = ReceiptLine.create({
      receiptId: receipt.id,
      itemId: item.id,
      unitId: unit.id,
      receivedQuantity: 9,
      acceptedQuantity: 9,
      rejectedQuantity: 0,
    });
    const lot = StockLot.create({ itemId: item.id, unitId: unit.id, receiptLineId: line.id });
    const movement = StockMovement.create({
      itemId: item.id,
      unitId: unit.id,
      lotId: lot.id,
      receiptLineId: line.id,
      type: "DONATION_IN",
      quantity: 9,
      occurredAt: "2024-01-15" as never,
      recordedBy: "test",
    });
    await receipts.saveFull(receipt, [line], [lot], [movement]);
    const found = await receipts.findByOperationKey(`receipt-${suffix}`);
    expect(found?.id).toBe(receipt.id);
    const lines = await receipts.findLinesByReceiptId(receipt.id);
    expect(lines).toHaveLength(1);
  });
});
