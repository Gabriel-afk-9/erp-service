import { describe, expect, it } from "vitest";
import { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { Instant } from "../../../../shared/domain/value-objects/instant.value-object.js";
import { FutureDateError } from "../../domain/errors/future-date.error.js";
import { ServiceRecordAlreadyCanceledError } from "../../domain/errors/service-record-already-canceled.error.js";
import { ServiceRecord } from "../../domain/entities/service-record.entity.js";
import { createExecutorInfo } from "../../domain/value-objects/executor-info.value-object.js";

function makeProps(overrides: Partial<Parameters<typeof ServiceRecord.create>[0]> = {}) {
  return {
    id: Id.generate(),
    activityId: "act-001",
    serviceTypeId: "st-medical",
    serviceTypeName: "Atendimento medico",
    familyId: "fam-001",
    personId: "per-001",
    membershipId: "mem-001",
    executor: createExecutorInfo("Maria Silva", "Assistente social"),
    occurredAt: CivilDate.from("2024-02-01"),
    recordedAt: Instant.from(new Date("2024-02-05T10:00:00.000Z")),
    recordedBy: "usr-001",
    note: "Atendimento de rotina",
    ...overrides,
  };
}

describe("ServiceRecord", () => {
  it("creates with valid fields, COMPLETED status and revision 1", () => {
    const record = ServiceRecord.create(makeProps());
    expect(record.status).toBe("COMPLETED");
    expect(record.revision).toBe(1);
  });

  it("creates a family-wide record with null personId (RF-ATD-03)", () => {
    const record = ServiceRecord.create(makeProps({ personId: null, membershipId: null }));
    expect(record.personId).toBeNull();
  });

  it("throws FutureDateError when occurredAt is after recordedAt", () => {
    expect(() =>
      ServiceRecord.create(
        makeProps({
          occurredAt: CivilDate.from("2024-03-01"),
          recordedAt: Instant.from(new Date("2024-02-05T10:00:00.000Z")),
        }),
      ),
    ).toThrow(FutureDateError);
  });

  it("cancel moves status to CANCELED, stores the reason and increments revision", () => {
    const record = ServiceRecord.create(makeProps());
    expect(record.cancelReason).toBeNull();
    record.cancel("Duplicado por engano");
    expect(record.status).toBe("CANCELED");
    expect(record.cancelReason).toBe("Duplicado por engano");
    expect(record.revision).toBe(2);
  });

  it("cancel on an already canceled record throws", () => {
    const record = ServiceRecord.create(makeProps());
    record.cancel("Primeiro motivo");
    expect(() => record.cancel("Outro motivo")).toThrow(ServiceRecordAlreadyCanceledError);
  });

  it("correctNote updates the note and increments revision", () => {
    const record = ServiceRecord.create(makeProps());
    record.correctNote("Nota corrigida");
    expect(record.note).toBe("Nota corrigida");
    expect(record.revision).toBe(2);
  });

  it("correctNote on a canceled record throws", () => {
    const record = ServiceRecord.create(makeProps());
    record.cancel("Duplicado por engano");
    expect(() => record.correctNote("Nova nota")).toThrow(ServiceRecordAlreadyCanceledError);
  });
});
