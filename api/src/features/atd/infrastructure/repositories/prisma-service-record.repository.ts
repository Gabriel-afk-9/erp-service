import type { Prisma, PrismaClient } from "@prisma/client";
import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import type { Instant } from "../../../../shared/domain/value-objects/instant.value-object.js";
import { HomeVisit } from "../../domain/entities/home-visit.entity.js";
import { ServiceRecord } from "../../domain/entities/service-record.entity.js";
import { ConcurrentModificationError } from "../../domain/errors/concurrent-modification.error.js";
import type {
  ServiceRecordAuditInput,
  ServiceRecordDateFilter,
  ServiceRecordDetail,
  ServiceRecordRepository,
} from "../../domain/repositories/service-record.repository.js";
import { createExecutorInfo } from "../../domain/value-objects/executor-info.value-object.js";

interface PersistedHomeVisit {
  id: string;
  serviceRecordId: string;
  observedSituation: string;
}

interface PersistedRecord {
  id: string;
  activityId: string;
  serviceTypeId: string;
  serviceTypeName: string;
  familyId: string;
  personId: string | null;
  membershipId: string | null;
  executorName: string;
  executorRole: string;
  occurredAt: Date;
  recordedAt: Date;
  recordedBy: string;
  note: string | null;
  status: "COMPLETED" | "CANCELED";
  revision: number;
  homeVisit: PersistedHomeVisit | null;
}

function toJson(value: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  if (value === null) return undefined;
  return value as unknown as Prisma.InputJsonValue;
}
function toCivilDate(value: Date): CivilDate {
  return value.toISOString().slice(0, 10) as CivilDate;
}

function toDetail(row: PersistedRecord): ServiceRecordDetail {
  const record = ServiceRecord.restore({
    id: Id.from(row.id),
    activityId: row.activityId,
    serviceTypeId: row.serviceTypeId,
    serviceTypeName: row.serviceTypeName,
    familyId: row.familyId,
    personId: row.personId,
    membershipId: row.membershipId,
    executor: createExecutorInfo(row.executorName, row.executorRole),
    occurredAt: toCivilDate(row.occurredAt),
    recordedAt: row.recordedAt.toISOString() as Instant,
    recordedBy: row.recordedBy,
    note: row.note,
    status: row.status,
    revision: row.revision,
  });
  const homeVisit =
    row.homeVisit === null
      ? null
      : HomeVisit.restore({
          id: Id.from(row.homeVisit.id),
          serviceRecordId: row.homeVisit.serviceRecordId,
          observedSituation: row.homeVisit.observedSituation,
        });
  return { record, homeVisit };
}

export class PrismaServiceRecordRepository implements ServiceRecordRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(record: ServiceRecord, homeVisit: HomeVisit | null, audit: ServiceRecordAuditInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (audit.operation === "CREATED") {
        await tx.serviceRecord.create({
          data: {
            id: record.id,
            activityId: record.activityId,
            serviceTypeId: record.serviceTypeId,
            serviceTypeName: record.serviceTypeName,
            familyId: record.familyId,
            personId: record.personId,
            membershipId: record.membershipId,
            executorName: record.executor.executorName,
            executorRole: record.executor.executorRole,
            occurredAt: new Date(record.occurredAt),
            recordedAt: new Date(record.recordedAt),
            recordedBy: record.recordedBy,
            note: record.note,
            status: record.status,
            revision: record.revision,
          },
        });
      } else {
        const updated = await tx.serviceRecord.updateMany({
          where: { id: record.id, revision: record.revision - 1 },
          data: { status: record.status, note: record.note, revision: record.revision },
        });
        if (updated.count === 0) {
          const current = await tx.serviceRecord.findUnique({ where: { id: record.id } });
          throw new ConcurrentModificationError(record.revision - 1, current?.revision ?? -1);
        }
      }

      if (homeVisit !== null) {
        await tx.homeVisit.upsert({
          where: { serviceRecordId: homeVisit.serviceRecordId },
          create: {
            id: homeVisit.id,
            serviceRecordId: homeVisit.serviceRecordId,
            observedSituation: homeVisit.observedSituation,
          },
          update: { observedSituation: homeVisit.observedSituation },
        });
      }

      await tx.serviceRecordAuditEntry.create({
        data: {
          serviceRecordId: record.id,
          operation: audit.operation,
          performedBy: audit.performedBy,
          before: toJson(audit.before),
          after: toJson(audit.after),
          reason: audit.reason,
        },
      });
    });
  }

  async findById(id: string): Promise<ServiceRecordDetail | null> {
    const row = await this.prisma.serviceRecord.findUnique({
      where: { id },
      include: { homeVisit: true },
    });
    if (row === null) return null;
    return toDetail(row as PersistedRecord);
  }

  async findByFamily(familyId: string, filter?: ServiceRecordDateFilter): Promise<ServiceRecordDetail[]> {
    const rows = await this.prisma.serviceRecord.findMany({
      where: {
        familyId,
        occurredAt: {
          gte: filter?.from === undefined ? undefined : new Date(filter.from),
          lte: filter?.to === undefined ? undefined : new Date(filter.to),
        },
      },
      include: { homeVisit: true },
      orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
    });
    return rows.map((row) => toDetail(row as PersistedRecord));
  }
}
