import { describe, expect, it } from "vitest";
import { ActivityNotFoundError } from "../../../domain/errors/activity-not-found.error.js";
import { ActivityNotOneOffError } from "../../../domain/errors/activity-not-one-off.error.js";
import { InMemoryActivityGateway } from "../in-memory-activity.gateway.js";
import { activitiesFixture } from "../fixtures/activities.fixture.js";

describe("InMemoryActivityGateway", () => {
  it("returns the snapshot for an active ONE_OFF activity", async () => {
    const gateway = new InMemoryActivityGateway(activitiesFixture);
    const result = await gateway.requireOneOffActivity("act-donation");
    expect(result.activityId).toBe("act-donation");
    expect(result.nature).toBe("ONE_OFF");
  });

  it("throws ActivityNotFoundError for an unknown id", async () => {
    const gateway = new InMemoryActivityGateway(activitiesFixture);
    await expect(gateway.requireOneOffActivity("act-unknown")).rejects.toBeInstanceOf(ActivityNotFoundError);
  });

  it("throws ActivityNotOneOffError for a PERIODIC activity", async () => {
    const gateway = new InMemoryActivityGateway([
      {
        activityId: "act-periodic",
        name: "Periodic",
        nature: "PERIODIC",
        serviceType: { serviceTypeId: "st-x", code: "X", name: "X" },
        revision: 1,
        isActive: true,
      },
    ]);
    await expect(gateway.requireOneOffActivity("act-periodic")).rejects.toBeInstanceOf(ActivityNotOneOffError);
  });

  it("throws ActivityNotFoundError for a closed activity", async () => {
    const gateway = new InMemoryActivityGateway(activitiesFixture);
    await expect(gateway.requireOneOffActivity("act-closed")).rejects.toBeInstanceOf(ActivityNotFoundError);
  });

  it("lists only active ONE_OFF activities", async () => {
    const gateway = new InMemoryActivityGateway(activitiesFixture);
    const result = await gateway.listActiveOneOffActivities();
    expect(result.map((a) => a.activityId).sort()).toEqual(["act-donation", "act-medical", "act-visit"]);
  });
});
