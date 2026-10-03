import { describe, expect, it } from "vitest";
import { PendingEligibilityGateway } from "../pending-eligibility.gateway.js";

describe("PendingEligibilityGateway", () => {
  it("always returns PENDING regardless of family or date", async () => {
    const gateway = new PendingEligibilityGateway();
    const result = await gateway.evaluate("fam-001", "2024-02-01");
    expect(result.status).toBe("PENDING");
  });

  it("returns a null policyId", async () => {
    const gateway = new PendingEligibilityGateway();
    const result = await gateway.evaluate("fam-002", "2024-02-01");
    expect(result.policyId).toBeNull();
  });

  it("returns a non-empty pending reason", async () => {
    const gateway = new PendingEligibilityGateway();
    const result = await gateway.evaluate("fam-001", "2024-02-01");
    expect(result.pendingReason).toBeTruthy();
  });

  it("returns an empty evidences array", async () => {
    const gateway = new PendingEligibilityGateway();
    const result = await gateway.evaluate("fam-001", "2024-02-01");
    expect(result.evidences).toEqual([]);
  });
});
