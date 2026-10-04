import { describe, expect, it } from "vitest";
import { StockCount, StockCountLine } from "../entities/stock-count.entity.js";
import { CountClosedError } from "../errors/count-closed.error.js";
import { CountLineInvalidError } from "../errors/count-line-invalid.error.js";

describe("StockCount entity", () => {
  it("opens and closes once", () => {
    const count = StockCount.create({ conductedBy: "op", conductedAt: "2024-01-01" as never });
    expect(count.status).toBe("OPEN");
    count.close("2024-01-02" as never);
    expect(count.status).toBe("CLOSED");
    expect(() => count.close("2024-01-03" as never)).toThrow(CountClosedError);
  });

  it("line variance is counted minus expected", () => {
    const line = StockCountLine.create({
      countId: "c1",
      itemId: "i1",
      unitId: "u1",
      expectedQuantity: 9,
      countedQuantity: 7,
    });
    expect(line.variance).toBe(-2);
  });

  it("rejects negative counted quantity", () => {
    expect(() =>
      StockCountLine.create({ countId: "c1", itemId: "i1", unitId: "u1", expectedQuantity: 9, countedQuantity: -1 }),
    ).toThrow(CountLineInvalidError);
  });
});
