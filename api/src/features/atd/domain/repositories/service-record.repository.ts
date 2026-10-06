import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { HomeVisit } from "../entities/home-visit.entity.js";
import type { ServiceRecord } from "../entities/service-record.entity.js";

export type ServiceRecordAuditOperation = "CREATED" | "CANCELED" | "NOTE_CORRECTED" | "REVERSED";

export interface ServiceRecordAuditInput {
  operation: ServiceRecordAuditOperation;
  performedBy: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
}

export interface ServiceRecordDetail {
  record: ServiceRecord;
  homeVisit: HomeVisit | null;
}

export interface ServiceRecordDateFilter {
  from?: CivilDate;
  to?: CivilDate;
}

export interface ServiceRecordRepository {
  save(record: ServiceRecord, homeVisit: HomeVisit | null, audit: ServiceRecordAuditInput): Promise<void>;
  findById(id: string): Promise<ServiceRecordDetail | null>;
  findByFamily(familyId: string, filter?: ServiceRecordDateFilter): Promise<ServiceRecordDetail[]>;
}
