import { describe, expect, it } from "vitest";
import { ActivityNotFoundError } from "../../../../shared/domain/errors/activity-not-found.error.js";
import { ActivityNotOneOffError } from "../../../../shared/domain/errors/activity-not-one-off.error.js";
import { FutureDateError } from "../../domain/errors/future-date.error.js";
import { HomeVisitNotAllowedError } from "../../domain/errors/home-visit-not-allowed.error.js";
import { HomeVisitRequiredError } from "../../domain/errors/home-visit-required.error.js";
import { PersonNotMemberAtDateError } from "../../domain/errors/person-not-member-at-date.error.js";
import { RegisterServiceRecordUseCase } from "../use-cases/register-service-record/register-service-record.use-case.js";
import {
  FakeServiceRecordRepository,
  StubActivityGateway,
  StubRegistryGateway,
  stubActivity,
  stubFamily,
  stubMembership,
} from "./fakes.js";

function makeUseCase() {
  const repository = new FakeServiceRecordRepository();
  const registry = new StubRegistryGateway([stubFamily()], [stubMembership()]);
  const activity = new StubActivityGateway([stubActivity()]);
  return { repository, useCase: new RegisterServiceRecordUseCase(repository, registry, activity) };
}

const baseInput = {
  activityId: "act-001",
  familyId: "fam-001",
  personId: "per-001",
  occurredAt: "2024-02-01",
  executorName: "Maria Silva",
  executorRole: "Assistente social",
  note: "Atendimento de rotina",
  homeVisit: null,
  recordedBy: "usr-001",
};

describe("RegisterServiceRecordUseCase", () => {
  it("registers a regular service with a valid person and current membership", async () => {
    const { repository, useCase } = makeUseCase();
    const output = await useCase.execute({ ...baseInput });
    expect(output.status).toBe("COMPLETED");
    expect(output.familyId).toBe("fam-001");
    expect(output.hasHomeVisit).toBe(false);
    expect(repository.audits[0]?.operation).toBe("CREATED");
  });

  it("registers a family-wide service without calling resolveMembership", async () => {
    const { useCase } = makeUseCase();
    const output = await useCase.execute({ ...baseInput, personId: null });
    expect(output.personId).toBeNull();
  });

  it("registers a home visit with observed situation", async () => {
    const repository = new FakeServiceRecordRepository();
    const registry = new StubRegistryGateway([stubFamily()], [stubMembership()]);
    const activity = new StubActivityGateway([
      stubActivity({
        activityId: "act-visit",
        serviceType: { serviceTypeId: "st-visit", code: "HOME_VISIT", name: "Visita domiciliar" },
      }),
    ]);
    const useCase = new RegisterServiceRecordUseCase(repository, registry, activity);
    const output = await useCase.execute({
      ...baseInput,
      activityId: "act-visit",
      homeVisit: { observedSituation: "Situacao estavel" },
    });
    expect(output.hasHomeVisit).toBe(true);
  });

  it("throws HomeVisitRequiredError when the activity is a home visit without detail", async () => {
    const repository = new FakeServiceRecordRepository();
    const registry = new StubRegistryGateway([stubFamily()], [stubMembership()]);
    const activity = new StubActivityGateway([
      stubActivity({
        activityId: "act-visit",
        serviceType: { serviceTypeId: "st-visit", code: "HOME_VISIT", name: "Visita domiciliar" },
      }),
    ]);
    const useCase = new RegisterServiceRecordUseCase(repository, registry, activity);
    await expect(useCase.execute({ ...baseInput, activityId: "act-visit" })).rejects.toBeInstanceOf(
      HomeVisitRequiredError,
    );
  });

  it("throws HomeVisitNotAllowedError when homeVisit is given for a non-visit activity", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ ...baseInput, homeVisit: { observedSituation: "X" } }),
    ).rejects.toBeInstanceOf(HomeVisitNotAllowedError);
  });

  it("throws ActivityNotFoundError for an unknown activity", async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute({ ...baseInput, activityId: "act-unknown" })).rejects.toBeInstanceOf(
      ActivityNotFoundError,
    );
  });

  it("throws ActivityNotOneOffError for a periodic activity", async () => {
    const repository = new FakeServiceRecordRepository();
    const registry = new StubRegistryGateway([stubFamily()], [stubMembership()]);
    const activity = new StubActivityGateway([
      { ...stubActivity({ activityId: "act-periodic" }), nature: "PERIODIC" },
    ]);
    const useCase = new RegisterServiceRecordUseCase(repository, registry, activity);
    await expect(useCase.execute({ ...baseInput, activityId: "act-periodic" })).rejects.toBeInstanceOf(
      ActivityNotOneOffError,
    );
  });

  it("throws PersonNotMemberAtDateError when the person has no membership on the date", async () => {
    const repository = new FakeServiceRecordRepository();
    const registry = new StubRegistryGateway([stubFamily()], []);
    const activity = new StubActivityGateway([stubActivity()]);
    const useCase = new RegisterServiceRecordUseCase(repository, registry, activity);
    await expect(useCase.execute({ ...baseInput })).rejects.toBeInstanceOf(PersonNotMemberAtDateError);
  });

  it("throws FutureDateError for a future occurredAt", async () => {
    const { useCase } = makeUseCase();
    await expect(useCase.execute({ ...baseInput, occurredAt: "2999-01-01" })).rejects.toBeInstanceOf(
      FutureDateError,
    );
  });

  it("creates two distinct records for the same person on different dates (AC-04)", async () => {
    const { repository, useCase } = makeUseCase();
    const first = await useCase.execute({ ...baseInput, occurredAt: "2024-02-01" });
    const second = await useCase.execute({ ...baseInput, occurredAt: "2024-03-01" });
    expect(first.serviceRecordId).not.toBe(second.serviceRecordId);
    expect(repository.store.size).toBe(2);
  });

  it("saves the creation audit entry", async () => {
    const { repository, useCase } = makeUseCase();
    await useCase.execute({ ...baseInput });
    expect(repository.audits).toHaveLength(1);
    expect(repository.audits[0]).toMatchObject({ operation: "CREATED", performedBy: "usr-001" });
  });
});
