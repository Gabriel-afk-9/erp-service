import { describe, expect, it } from "vitest";
import { ReceiptLine } from "../entities/receipt-line.entity.js";
import { ReceiptLineInvalidError } from "../errors/receipt-line-invalid.error.js";

const BASE = { receiptId: "r1", itemId: "i1", unitId: "u1" };

describe("ReceiptLine entity", () => {
  it("accepts accepted + rejected = received", () => {
    const line = ReceiptLine.create({ ...BASE, receivedQuantity: 10, acceptedQuantity: 8, rejectedQuantity: 2, rejectionReason: "Avaria" });
    expect(line.acceptedQuantity).toBe(8);
  });

  it("accepts fully rejected line with reason", () => {
    const line = ReceiptLine.create({ ...BASE, receivedQuantity: 5, acceptedQuantity: 0, rejectedQuantity: 5, rejectionReason: "Vencido" });
    expect(line.acceptedQuantity).toBe(0);
  });

  it("rejects sum mismatch", () => {
    expect(() => ReceiptLine.create({ ...BASE, receivedQuantity: 10, acceptedQuantity: 7, rejectedQuantity: 2, rejectionReason: "X" })).toThrow(
      ReceiptLineInvalidError,
    );
  });

  it("rejects discard without reason", () => {
    expect(() => ReceiptLine.create({ ...BASE, receivedQuantity: 10, acceptedQuantity: 9, rejectedQuantity: 1 })).toThrow(
      ReceiptLineInvalidError,
    );
  });

  it("rejects negative quantities", () => {
    expect(() => ReceiptLine.create({ ...BASE, receivedQuantity: -1, acceptedQuantity: 0, rejectedQuantity: 0 })).toThrow(
      ReceiptLineInvalidError,
    );
  });
});
