import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import type { Instant } from "../../../../shared/domain/value-objects/instant.value-object.js";
import { FutureDateError } from "../errors/future-date.error.js";
import { NoteInvalidError } from "../errors/note-invalid.error.js";
import { ServiceRecordAlreadyCanceledError } from "../errors/service-record-already-canceled.error.js";
import type { ExecutorInfo } from "../value-objects/executor-info.value-object.js";

export type ServiceRecordStatus = "COMPLETED" | "CANCELED" | "REVERSED";

export const SERVICE_RECORD_NOTE_MAX_LENGTH = 500;

export interface ServiceRecordProps {
  id: Id;
  activityId: string;
  serviceTypeId: string;
  serviceTypeName: string;
  familyId: string;
  personId: string | null;
  membershipId: string | null;
  executor: ExecutorInfo;
  occurredAt: CivilDate;
  recordedAt: Instant;
  recordedBy: string;
  note: string | null;
  cancelReason: string | null;
  status: ServiceRecordStatus;
  revision: number;
}

export function normalizeNote(note: string | null | undefined): string | null {
  if (note === null || note === undefined) return null;
  const trimmed = note.trim();
  if (trimmed.length === 0) throw new NoteInvalidError();
  if (trimmed.length > SERVICE_RECORD_NOTE_MAX_LENGTH) throw new NoteInvalidError();
  return trimmed;
}

export class ServiceRecord {
  private constructor(private props: ServiceRecordProps) {}

  static create(input: {
    id: Id;
    activityId: string;
    serviceTypeId: string;
    serviceTypeName: string;
    familyId: string;
    personId: string | null;
    membershipId: string | null;
    executor: ExecutorInfo;
    occurredAt: CivilDate;
    recordedAt: Instant;
    recordedBy: string;
    note: string | null;
  }): ServiceRecord {
    if (input.recordedAt.slice(0, 10) < input.occurredAt) {
      throw new FutureDateError(input.occurredAt);
    }
    return new ServiceRecord({
      ...input,
      note: normalizeNote(input.note),
      cancelReason: null,
      status: "COMPLETED",
      revision: 1,
    });
  }

  static restore(props: ServiceRecordProps): ServiceRecord {
    return new ServiceRecord({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get activityId(): string {
    return this.props.activityId;
  }

  get serviceTypeId(): string {
    return this.props.serviceTypeId;
  }

  get serviceTypeName(): string {
    return this.props.serviceTypeName;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get personId(): string | null {
    return this.props.personId;
  }

  get membershipId(): string | null {
    return this.props.membershipId;
  }

  get executor(): ExecutorInfo {
    return this.props.executor;
  }

  get occurredAt(): CivilDate {
    return this.props.occurredAt;
  }

  get recordedAt(): Instant {
    return this.props.recordedAt;
  }

  get recordedBy(): string {
    return this.props.recordedBy;
  }

  get note(): string | null {
    return this.props.note;
  }

  get cancelReason(): string | null {
    return this.props.cancelReason;
  }

  get status(): ServiceRecordStatus {
    return this.props.status;
  }

  get revision(): number {
    return this.props.revision;
  }

  cancel(reason: string): void {
    if (this.props.status === "CANCELED") {
      throw new ServiceRecordAlreadyCanceledError(this.props.id);
    }
    this.props = { ...this.props, status: "CANCELED", cancelReason: reason, revision: this.props.revision + 1 };
  }

  correctNote(newNote: string | null): void {
    if (this.props.status === "CANCELED") {
      throw new ServiceRecordAlreadyCanceledError(this.props.id);
    }
    this.props = { ...this.props, note: normalizeNote(newNote), revision: this.props.revision + 1 };
  }

  markReversed(): void {
    if (this.props.status !== "COMPLETED") {
      throw new ServiceRecordAlreadyCanceledError(this.props.id);
    }
    this.props = { ...this.props, status: "REVERSED", revision: this.props.revision + 1 };
  }
}
