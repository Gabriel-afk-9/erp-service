import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { Instant } from "../../../../shared/domain/value-objects/instant.value-object.js";
import { HomeVisit } from "../../domain/entities/home-visit.entity.js";
import { ServiceRecord } from "../../domain/entities/service-record.entity.js";
import { createExecutorInfo } from "../../domain/value-objects/executor-info.value-object.js";
import { PrismaServiceRecordRepository } from "../repositories/prisma-service-record.repository.js";

const prisma = new PrismaClient();
const repository = new PrismaServiceRecordRepository(prisma);

function makeRecord(id: string, occurredAt: string) {
  return ServiceRecord.create({
    id: Id.from(id),
    activityId: "44444444-4444-4444-4444-444444444444",
    serviceTypeId: "st-medical",
    serviceTypeName: "Atendimento medico",
    familyId: "22222222-2222-2222-2222-222222222222",
    personId: "33333333-3333-3333-3333-333333333333",
    membershipId: "mem-001",
    executor: createExecutorInfo("Maria Silva", "Assistente social"),
    occurredAt: CivilDate.from(occurredAt),
    recordedAt: Instant.from(new Date()),
    recordedBy: "11111111-1111-1111-1111-111111111111",
    note: null,
  });
}

async function clean(id: string) {
  await prisma.serviceRecordAuditEntry.deleteMany({ where: { serviceRecordId: id } });
  await prisma.homeVisit.deleteMany({ where: { serviceRecordId: id } });
  await prisma.serviceRecord.deleteMany({ where: { id } });
}

describe("PrismaServiceRecordRepository", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("saves and retrieves a ServiceRecord by id", async () => {
    const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await clean(id);
    await repository.save(makeRecord(id, "2024-02-01"), null, {
      operation: "CREATED",
      performedBy: "11111111-1111-1111-1111-111111111111",
      before: null,
      after: { status: "COMPLETED", revision: 1 },
      reason: null,
    });
    const found = await repository.findById(id);
    expect(found?.record.status).toBe("COMPLETED");
    await clean(id);
  });

  it("saves a ServiceRecord with HomeVisit and retrieves both", async () => {
    const id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    await clean(id);
    const homeVisit = HomeVisit.create({ id: Id.generate(), serviceRecordId: id, observedSituation: "Estavel" });
    await repository.save(makeRecord(id, "2024-02-01"), homeVisit, {
      operation: "CREATED",
      performedBy: "11111111-1111-1111-1111-111111111111",
      before: null,
      after: { status: "COMPLETED", revision: 1 },
      reason: null,
    });
    const found = await repository.findById(id);
    expect(found?.homeVisit?.observedSituation).toBe("Estavel");
    await clean(id);
  });

  it("records a cancel with its audit entry in the same transaction", async () => {
    const id = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    await clean(id);
    const record = makeRecord(id, "2024-02-01");
    await repository.save(record, null, {
      operation: "CREATED",
      performedBy: "11111111-1111-1111-1111-111111111111",
      before: null,
      after: null,
      reason: null,
    });
    record.cancel("Duplicidade");
    await repository.save(record, null, {
      operation: "CANCELED",
      performedBy: "11111111-1111-1111-1111-111111111111",
      before: { status: "COMPLETED", revision: 1 },
      after: { status: "CANCELED", revision: 2 },
      reason: "Duplicidade",
    });
    const entries = await prisma.serviceRecordAuditEntry.findMany({ where: { serviceRecordId: id } });
    expect(entries.map((e) => e.operation).sort()).toEqual(["CANCELED", "CREATED"]);
    await clean(id);
  });

  it("findByFamily returns records ordered by occurredAt desc", async () => {
    const ids = ["d0000000-0000-0000-0000-000000000001", "d0000000-0000-0000-0000-000000000002"];
    for (const id of ids) await clean(id);
    await repository.save(makeRecord(ids[0]!, "2024-01-10"), null, {
      operation: "CREATED",
      performedBy: "11111111-1111-1111-1111-111111111111",
      before: null,
      after: null,
      reason: null,
    });
    await repository.save(makeRecord(ids[1]!, "2024-03-10"), null, {
      operation: "CREATED",
      performedBy: "11111111-1111-1111-1111-111111111111",
      before: null,
      after: null,
      reason: null,
    });
    const found = await repository.findByFamily("22222222-2222-2222-2222-222222222222");
    expect(found.map((f) => f.record.occurredAt)).toEqual(["2024-03-10", "2024-01-10"]);
    for (const id of ids) await clean(id);
  });

  it("findByFamily respects the from/to filter", async () => {
    const ids = ["e0000000-0000-0000-0000-000000000001", "e0000000-0000-0000-0000-000000000002"];
    for (const id of ids) await clean(id);
    await repository.save(makeRecord(ids[0]!, "2024-01-10"), null, {
      operation: "CREATED",
      performedBy: "11111111-1111-1111-1111-111111111111",
      before: null,
      after: null,
      reason: null,
    });
    await repository.save(makeRecord(ids[1]!, "2024-03-10"), null, {
      operation: "CREATED",
      performedBy: "11111111-1111-1111-1111-111111111111",
      before: null,
      after: null,
      reason: null,
    });
    const found = await repository.findByFamily("22222222-2222-2222-2222-222222222222", {
      from: CivilDate.from("2024-02-01"),
      to: CivilDate.from("2024-04-01"),
    });
    expect(found).toHaveLength(1);
    for (const id of ids) await clean(id);
  });

  it("saving twice with the same id does not duplicate the record", async () => {
    const id = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    await clean(id);
    await repository.save(makeRecord(id, "2024-02-01"), null, {
      operation: "CREATED",
      performedBy: "11111111-1111-1111-1111-111111111111",
      before: null,
      after: null,
      reason: null,
    });
    const count = await prisma.serviceRecord.count({ where: { id } });
    expect(count).toBe(1);
    await clean(id);
  });
});
