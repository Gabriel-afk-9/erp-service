import { describe, expect, it } from "vitest";
import { prisma } from "../../../../shared/infrastructure/database/prisma.client.js";
import { BazarTransfer } from "../../domain/entities/bazar-transfer.entity.js";
import { Category } from "../../domain/entities/category.entity.js";
import { Item } from "../../domain/entities/item.entity.js";
import { ReceiptLine } from "../../domain/entities/receipt-line.entity.js";
import { StockLot } from "../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../domain/entities/stock-movement.entity.js";
import { StockReceipt } from "../../domain/entities/stock-receipt.entity.js";
import { Unit } from "../../domain/entities/unit.entity.js";
import { DecimalPlaces } from "../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../domain/value-objects/quantity-increment.value-object.js";
import { PrismaBazarTransferRepository } from "../repositories/prisma-bazar-transfer.repository.js";
import { PrismaCategoryRepository } from "../repositories/prisma-category.repository.js";
import { PrismaItemRepository } from "../repositories/prisma-item.repository.js";
import { PrismaUnitRepository } from "../repositories/prisma-unit.repository.js";

describe("PrismaBazarTransferRepository integration", () => {
  it("saves transfer with receipt, lines, lots and BAZAR_IN atomically", async () => {
    const categories = new PrismaCategoryRepository(prisma);
    const units = new PrismaUnitRepository(prisma);
    const items = new PrismaItemRepository(prisma);
    const transfers = new PrismaBazarTransferRepository(prisma);
    const suffix = Date.now();
    const category = Category.create({ name: `Baz ${suffix}` });
    await categories.save(category);
    const unit = Unit.create({
      symbol: `B${String(suffix).slice(-6)}`,
      name: "Unidade",
      decimalPlaces: DecimalPlaces.of(0),
      quantityIncrement: QuantityIncrement.of(1),
    });
    await units.save(unit);
    const item = Item.create({ categoryId: category.id, unitId: unit.id, name: `Item Baz ${suffix}`, requiresExpiration: false });
    await items.save(item);
    const receipt = StockReceipt.create({
      originType: "BAZAR",
      receivedBy: "test",
      receivedAt: "2024-02-01" as never,
      operationKey: `bazar-${suffix}`,
      fingerprint: "test",
    });
    const line = ReceiptLine.create({
      receiptId: receipt.id,
      itemId: item.id,
      unitId: unit.id,
      informedQuantity: 10,
      receivedQuantity: 8,
      acceptedQuantity: 8,
      rejectedQuantity: 0,
    });
    const lot = StockLot.create({ itemId: item.id, unitId: unit.id, receiptLineId: line.id });
    const movement = StockMovement.create({
      itemId: item.id,
      unitId: unit.id,
      lotId: lot.id,
      receiptLineId: line.id,
      type: "BAZAR_IN",
      quantity: 8,
      occurredAt: "2024-02-01" as never,
      recordedBy: "test",
    });
    const transfer = BazarTransfer.create({ receiptId: receipt.id, externalReference: `BAZ-${suffix}` });
    await transfers.saveFull(transfer, receipt, [line], [lot], [movement]);
    const found = await transfers.findByExternalReference(`BAZ-${suffix}`);
    expect(found?.receiptId).toBe(receipt.id);
    const stored = await prisma.stockMovement.findFirst({ where: { receiptLineId: line.id } });
    expect(stored?.type).toBe("BAZAR_IN");
  });
});
