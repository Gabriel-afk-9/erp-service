import { describe, expect, it } from "vitest";
import { ServiceRecord } from "../../domain/entities/service-record.entity.js";
import { ServiceRecordHasDeliveryError } from "../../domain/errors/service-record-has-delivery.error.js";
import type { ServiceRecordRepository } from "../../domain/repositories/service-record.repository.js";
import { createExecutorInfo } from "../../domain/value-objects/executor-info.value-object.js";
import { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { Instant } from "../../../../shared/domain/value-objects/instant.value-object.js";
import { CancelServiceRecordUseCase } from "../use-cases/cancel-service-record/cancel-service-record.use-case.js";

function makeRecord() {
  return ServiceRecord.create({
    id: Id.generate(),
    activityId: "act-visit",
    serviceTypeId: "st-visit",
    serviceTypeName: "Visita domiciliar",
    familyId: "fam-1",
    personId: null,
    membershipId: null,
    executor: createExecutorInfo("Joana", "Assistente"),
    occurredAt: CivilDate.from("2024-03-01"),
    recordedAt: Instant.now(),
    recordedBy: "op",
    note: null,
  });
}

class FakeRecords implements ServiceRecordRepository {
  constructor(readonly record: ServiceRecord) {}

  async save(): Promise<void> {}

  async findById() {
    return { record: this.record, homeVisit: null };
  }

  async findByFamily() {
    return [];
  }
}

describe("CancelServiceRecordUseCase delivery guard (D2)", () => {
  it("blocks cancel when a delivery exists", async () => {
    const record = makeRecord();
    const useCase = new CancelServiceRecordUseCase(new FakeRecords(record), async () => false);
    await expect(
      useCase.execute({ serviceRecordId: record.id, reason: "Engano", expectedRevision: 1, performedBy: "op" }),
    ).rejects.toThrow(ServiceRecordHasDeliveryError);
  });

  it("allows cancel when no delivery exists (default null preserved)", async () => {
    const record = makeRecord();
    const useCase = new CancelServiceRecordUseCase(new FakeRecords(record));
    const output = await useCase.execute({ serviceRecordId: record.id, reason: "Engano", expectedRevision: 1, performedBy: "op" });
    expect(output.status).toBe("CANCELED");
  });
});
