import { describe, expect, it } from "vitest";
import { Delivery } from "../entities/delivery.entity.js";

describe("Delivery entity", () => {
  it("creates COMPLETED and marks REVERSED once", () => {
    const delivery = Delivery.create({
      serviceRecordId: "sr-1",
      familyId: "fam-1",
      assessmentId: "as-1",
      eligibilityStatus: "PENDING",
      occurredAt: "2024-03-01" as never,
      executorName: "Joana",
      executorRole: "Assistente",
      operationKey: "op-1",
      fingerprint: "fp-1",
    });
    expect(delivery.status).toBe("COMPLETED");
    delivery.markReversed();
    expect(delivery.status).toBe("REVERSED");
  });
});
