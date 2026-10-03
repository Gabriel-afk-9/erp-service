import { describe, expect, it } from "vitest";
import { InMemoryRegistryGateway } from "../in-memory-registry.gateway.js";
import { familiesFixture } from "../fixtures/families.fixture.js";
import { peopleFixture } from "../fixtures/people.fixture.js";

function makeGateway() {
  return new InMemoryRegistryGateway(familiesFixture, peopleFixture);
}

describe("InMemoryRegistryGateway", () => {
  it("resolves membership when startDate <= asOf and endDate is null", async () => {
    const gateway = makeGateway();
    const result = await gateway.resolveMembership("per-001", "2024-02-01");
    expect(result?.membershipId).toBe("mem-001");
  });

  it("resolves membership when endDate > asOf", async () => {
    const gateway = makeGateway();
    const result = await gateway.resolveMembership("per-007", "2024-03-01");
    expect(result?.membershipId).toBe("mem-007");
  });

  it("returns null when the membership has ended before asOf", async () => {
    const gateway = makeGateway();
    const result = await gateway.resolveMembership("per-007", "2024-07-01");
    expect(result).toBeNull();
  });

  it("returns null when personId does not exist", async () => {
    const gateway = makeGateway();
    expect(await gateway.resolveMembership("per-unknown", "2024-02-01")).toBeNull();
  });

  it("lists active memberships and excludes ended ones", async () => {
    const gateway = makeGateway();
    const active = await gateway.listActiveMemberships("fam-001", "2024-02-01");
    expect(active.map((m) => m.membershipId)).toEqual(
      expect.arrayContaining(["mem-001", "mem-002", "mem-003"]),
    );
    const later = await gateway.listActiveMemberships("fam-003", "2024-07-01");
    expect(later.map((m) => m.membershipId)).not.toContain("mem-007");
  });

  it("returns empty list for a family without members", async () => {
    const gateway = makeGateway();
    expect(await gateway.listActiveMemberships("fam-unknown", "2024-02-01")).toEqual([]);
  });
});
