import { ReceiptLine } from "../../domain/entities/receipt-line.entity.js";
import { ItemInactiveError } from "../../domain/errors/item-inactive.error.js";
import { ItemNotFoundError } from "../../domain/errors/item-not-found.error.js";
import { LotExpirationRequiredError } from "../../domain/errors/lot-expiration-required.error.js";
import { ReceiptLineInvalidError } from "../../domain/errors/receipt-line-invalid.error.js";
import { UnitMismatchError } from "../../domain/errors/unit-mismatch.error.js";
import type { ItemRepository } from "../../domain/repositories/item.repository.js";
import type { UnitRepository } from "../../domain/repositories/unit.repository.js";

export interface RawReceiptLine {
  itemId: string;
  informedQuantity?: number | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
  expiresOn?: string | null;
}

function fractionDigits(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  if (dot === -1) return 0;
  return text.length - dot - 1;
}

export async function validateReceiptLine(
  items: ItemRepository,
  units: UnitRepository,
  receiptId: string,
  raw: RawReceiptLine,
): Promise<{ line: ReceiptLine; itemUnitId: string }> {
  const item = await items.findById(raw.itemId);
  if (item === null) {
    throw new ItemNotFoundError(raw.itemId);
  }
  if (!item.isActive) {
    throw new ItemInactiveError(raw.itemId);
  }
  const unit = await units.findById(item.unitId);
  if (unit === null) {
    throw new UnitMismatchError(item.id, item.unitId, "unknown");
  }
  for (const quantity of [raw.receivedQuantity, raw.acceptedQuantity, raw.rejectedQuantity]) {
    if (fractionDigits(quantity) > unit.decimalPlaces) {
      throw new ReceiptLineInvalidError(
        `quantity ${quantity} exceeds unit ${unit.symbol} precision of ${unit.decimalPlaces} decimal places`,
      );
    }
  }
  if (raw.acceptedQuantity > 0 && item.requiresExpiration && (raw.expiresOn ?? null) === null) {
    throw new LotExpirationRequiredError(item.id);
  }
  const line = ReceiptLine.create({
    receiptId,
    itemId: item.id,
    unitId: item.unitId,
    informedQuantity: raw.informedQuantity ?? null,
    receivedQuantity: raw.receivedQuantity,
    acceptedQuantity: raw.acceptedQuantity,
    rejectedQuantity: raw.rejectedQuantity,
    rejectionReason: raw.rejectionReason ?? null,
    expiresOn: raw.expiresOn ?? null,
  });
  return { line, itemUnitId: item.unitId };
}
