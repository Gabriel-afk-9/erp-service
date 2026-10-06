import { describe, expect, it } from "vitest";
import { ReportChangedError } from "../../domain/errors/report-changed.error.js";
import { ReportInvalidPeriodError } from "../../domain/errors/report-invalid-period.error.js";
import { StockMovementReportUseCase } from "../use-cases/stock-movement-report/stock-movement-report.use-case.js";
import { FakeReportRepository, stockRow } from "./fakes.js";

const PERIOD = { from: "2026-01-01", to: "2026-12-31" };

function repository() {
  const repo = new FakeReportRepository();
  repo.stockOpening = 10;
  repo.stockMovements = [
    stockRow({ balanceDelta: 5, movementId: "m-1", quantity: 5, type: "DONATION_IN" }),
    stockRow({ balanceDelta: -2, movementId: "m-2", quantity: 2, type: "DELIVERY_OUT" }),
    stockRow({ balanceDelta: 0, movementId: "m-3", quantity: 1, type: "TRIAGE_DISCARD" }),
    stockRow({ balanceDelta: 3, itemId: "item-2", itemName: "Feijão", movementId: "m-4", quantity: 3, type: "BAZAR_IN" }),
  ];
  return repo;
}

describe("StockMovementReportUseCase", () => {
  it("rejects an inverted period", async () => {
    const useCase = new StockMovementReportUseCase(new FakeReportRepository());
    await expect(useCase.execute({ from: "2026-12-31", to: "2026-01-01" })).rejects.toThrow(ReportInvalidPeriodError);
  });

  it("computes opening and closing balances with grouping", async () => {
    const useCase = new StockMovementReportUseCase(repository());
    const output = await useCase.execute(PERIOD);
    expect(output.openingBalance).toBe(10);
    expect(output.closingBalance).toBe(16);
    expect(output.totalsByItem).toHaveLength(2);
    expect(output.totalsByType.find((total) => total.type === "DONATION_IN")).toMatchObject({ count: 1, inbound: 5, net: 5, outbound: 0 });
    expect(output.movements).toHaveLength(4);
    expect(output.queryFingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("lists TRIAGE_DISCARD rows without changing the balance", async () => {
    const useCase = new StockMovementReportUseCase(repository());
    const output = await useCase.execute({ ...PERIOD, movementType: "TRIAGE_DISCARD" });
    expect(output.movements.map((movement) => movement.movementId)).toEqual(["m-3"]);
    expect(output.openingBalance).toBe(10);
    expect(output.closingBalance).toBe(10);
    expect(output.totalsByType).toHaveLength(1);
    expect(output.totalsByType[0]).toMatchObject({ count: 1, inbound: 0, net: 0, outbound: 0, type: "TRIAGE_DISCARD" });
  });

  it("returns 409 REPORT_CHANGED when sources changed between totals and records", async () => {
    const repo = repository();
    const useCase = new StockMovementReportUseCase(repo);
    const totals = await useCase.execute(PERIOD);
    repo.stockMovements.push(stockRow({ balanceDelta: 7, movementId: "m-5", quantity: 7, type: "DONATION_IN", updatedAt: "2026-06-01T10:00:00.000Z" }));
    await expect(useCase.execute({ ...PERIOD, expectedQueryFingerprint: totals.queryFingerprint, page: 1, pageSize: 20 })).rejects.toThrow(ReportChangedError);
  });

  it("paginates records with a fresh fingerprint from the same universe", async () => {
    const useCase = new StockMovementReportUseCase(repository());
    const totals = await useCase.execute(PERIOD);
    const records = await useCase.execute({ ...PERIOD, expectedQueryFingerprint: totals.queryFingerprint, page: 1, pageSize: 2 });
    expect("total" in records ? records.total : -1).toBe(4);
    expect(records.movements).toHaveLength(2);
    expect(records.queryFingerprint).toBe(totals.queryFingerprint);
  });
});
