import { describe, expect, it } from "vitest";
import { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { Instant } from "../../../../shared/domain/value-objects/instant.value-object.js";
import { ServiceRecord } from "../../domain/entities/service-record.entity.js";
import { ConcurrentModificationError } from "../../domain/errors/concurrent-modification.error.js";
import { ServiceRecordAlreadyCanceledError } from "../../domain/errors/service-record-already-canceled.error.js";
import { ServiceRecordNotFoundError } from "../../domain/errors/service-record-not-found.error.js";
import { createExecutorInfo } from "../../domain/value-objects/executor-info.value-object.js";
import { CorrectServiceRecordNoteUseCase } from "../use-cases/correct-service-record-note/correct-service-record-note.use-case.js";
import { FakeServiceRecordRepository } from "./fakes.js";

async function seedActive(repository: FakeServiceRecordRepository) {
  const record = ServiceRecord.create({
    id: Id.generate(),
    activityId: "act-001",
    serviceTypeId: "st-medical",
    serviceTypeName: "Atendimento medico",
    familyId: "fam-001",
    personId: null,
    membershipId: null,
    executor: createExecutorInfo("Maria Silva", "Assistente social"),
    occurredAt: CivilDate.from("2024-02-01"),
    recordedAt: Instant.from(new Date("2024-02-05T10:00:00.000Z")),
    recordedBy: "usr-001",
    note: "Nota original",
  });
  await repository.save(record, null, {
    operation: "CREATED",
    performedBy: "usr-001",
    before: null,
    after: null,
    reason: null,
  });
  return record;
}

describe("CorrectServiceRecordNoteUseCase", () => {
  it("corrects the note with reason and correct revision", async () => {
    const repository = new FakeServiceRecordRepository();
    const record = await seedActive(repository);
    const useCase = new CorrectServiceRecordNoteUseCase(repository);
    const output = await useCase.execute({
      serviceRecordId: record.id,
      newNote: "Nota corrigida",
      reason: "Erro de digitacao",
      expectedRevision: 1,
      performedBy: "usr-001",
    });
    expect(output.note).toBe("Nota corrigida");
    expect(output.revision).toBe(2);
  });

  it("throws ServiceRecordNotFoundError for an unknown id", async () => {
    const useCase = new CorrectServiceRecordNoteUseCase(new FakeServiceRecordRepository());
    await expect(
      useCase.execute({
        serviceRecordId: "missing",
        newNote: "X",
        reason: "Motivo valido",
        expectedRevision: 1,
        performedBy: "usr-001",
      }),
    ).rejects.toBeInstanceOf(ServiceRecordNotFoundError);
  });

  it("throws ServiceRecordAlreadyCanceledError for a canceled record", async () => {
    const repository = new FakeServiceRecordRepository();
    const record = await seedActive(repository);
    record.cancel();
    const useCase = new CorrectServiceRecordNoteUseCase(repository);
    await expect(
      useCase.execute({
        serviceRecordId: record.id,
        newNote: "X",
        reason: "Motivo valido",
        expectedRevision: record.revision,
        performedBy: "usr-001",
      }),
    ).rejects.toBeInstanceOf(ServiceRecordAlreadyCanceledError);
  });

  it("throws ConcurrentModificationError for a stale expectedRevision", async () => {
    const repository = new FakeServiceRecordRepository();
    const record = await seedActive(repository);
    const useCase = new CorrectServiceRecordNoteUseCase(repository);
    await expect(
      useCase.execute({
        serviceRecordId: record.id,
        newNote: "X",
        reason: "Motivo valido",
        expectedRevision: 99,
        performedBy: "usr-001",
      }),
    ).rejects.toBeInstanceOf(ConcurrentModificationError);
  });
});
