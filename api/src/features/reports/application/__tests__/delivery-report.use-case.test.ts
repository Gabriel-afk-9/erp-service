import { describe, expect, it } from "vitest";
import { ReportChangedError } from "../../domain/errors/report-changed.error.js";
import { DeliveryReportUseCase } from "../use-cases/delivery-report/delivery-report.use-case.js";
import { FakeReportRepository, deliveryRow } from "./fakes.js";

const PERIOD = { from: "2026-01-01", to: "2026-12-31" };

function repository() {
  const repo = new FakeReportRepository();
  repo.deliveries = [
    deliveryRow({
      deliveryId: "d-1",
      lines: [
        { itemId: "item-1", itemName: "Arroz", lineId: "l-1", quantity: 2, stockLotId: "lot-1", unitId: "unit-1", unitSymbol: "KG" },
        { itemId: "item-1", itemName: "Arroz", lineId: "l-2", quantity: 3, stockLotId: "lot-2", unitId: "unit-1", unitSymbol: "KG" },
      ],
    }),
    deliveryRow({
      deliveryId: "d-2",
      familyId: "fam-2",
      familyCode: "FAM-002",
      lines: [
        { itemId: "item-1", itemName: "Arroz", lineId: "l-3", quantity: 1, stockLotId: "lot-1", unitId: "unit-1", unitSymbol: "KG" },
      ],
      status: "REVERSED",
      updatedAt: "2026-04-06T10:00:00.000Z",
    }),
  ];
  return repo;
}

describe("DeliveryReportUseCase", () => {
  it("counts a two-line delivery once and sums quantities (RN-19)", async () => {
    const useCase = new DeliveryReportUseCase(repository());
    const output = await useCase.execute({ ...PERIOD, status: "COMPLETED" });
    expect(output.deliveryCount).toBe(1);
    expect(output.familyCount).toBe(1);
    expect(output.totalsByItem).toHaveLength(1);
    expect(output.totalsByItem[0]).toMatchObject({ deliveryCount: 1, itemName: "Arroz", quantity: 5 });
  });

  it("includes REVERSED deliveries in the unfiltered total and filters them on demand", async () => {
    const useCase = new DeliveryReportUseCase(repository());
    const all = await useCase.execute(PERIOD);
    expect(all.deliveryCount).toBe(2);
    expect(all.familyCount).toBe(2);
    expect(all.deliveries.map((delivery) => delivery.status).sort()).toEqual(["COMPLETED", "REVERSED"]);
    const reversed = await useCase.execute({ ...PERIOD, status: "REVERSED" });
    expect(reversed.deliveryCount).toBe(1);
    expect(reversed.deliveries[0]?.deliveryId).toBe("d-2");
  });

  it("sets serviceRecordCount to the COMPLETED delivery count without a separate query", async () => {
    const useCase = new DeliveryReportUseCase(repository());
    const all = await useCase.execute(PERIOD);
    expect(all.serviceRecordCount).toBe(1);
    const completed = await useCase.execute({ ...PERIOD, status: "COMPLETED" });
    expect(completed.serviceRecordCount).toBe(completed.deliveryCount);
  });

  it("returns 409 REPORT_CHANGED when sources changed between totals and records", async () => {
    const repo = repository();
    const useCase = new DeliveryReportUseCase(repo);
    const totals = await useCase.execute(PERIOD);
    repo.deliveries.push(deliveryRow({ deliveryId: "d-3", updatedAt: "2026-07-01T10:00:00.000Z" }));
    await expect(useCase.execute({ ...PERIOD, expectedQueryFingerprint: totals.queryFingerprint })).rejects.toThrow(ReportChangedError);
  });
});
