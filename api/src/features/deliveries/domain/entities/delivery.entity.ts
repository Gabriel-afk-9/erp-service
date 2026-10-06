import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { EligibilityStatus } from "../../../../shared/domain/gateways/eligibility.gateway.js";

export type DeliveryStatus = "COMPLETED" | "REVERSED";

export interface DeliveryProps {
  id: string;
  serviceRecordId: string;
  familyId: string;
  assessmentId: string;
  eligibilityStatus: EligibilityStatus;
  occurredAt: CivilDate;
  collectedByPersonId: string | null;
  collectedByMembershipId: string | null;
  executorName: string;
  executorRole: string;
  exceptionReason: string | null;
  authorizedBy: string | null;
  operationKey: string;
  fingerprint: string;
  status: DeliveryStatus;
}

export interface NewDeliveryProps {
  serviceRecordId: string;
  familyId: string;
  assessmentId: string;
  eligibilityStatus: EligibilityStatus;
  occurredAt: CivilDate;
  collectedByPersonId?: string | null;
  collectedByMembershipId?: string | null;
  executorName: string;
  executorRole: string;
  exceptionReason?: string | null;
  authorizedBy?: string | null;
  operationKey: string;
  fingerprint: string;
}

export class Delivery {
  private constructor(private props: DeliveryProps) {}

  static create(input: NewDeliveryProps): Delivery {
    return new Delivery({
      id: Id.generate(),
      serviceRecordId: input.serviceRecordId,
      familyId: input.familyId,
      assessmentId: input.assessmentId,
      eligibilityStatus: input.eligibilityStatus,
      occurredAt: input.occurredAt,
      collectedByPersonId: input.collectedByPersonId ?? null,
      collectedByMembershipId: input.collectedByMembershipId ?? null,
      executorName: input.executorName.trim(),
      executorRole: input.executorRole.trim(),
      exceptionReason: input.exceptionReason?.trim() || null,
      authorizedBy: input.authorizedBy?.trim() || null,
      operationKey: input.operationKey,
      fingerprint: input.fingerprint,
      status: "COMPLETED",
    });
  }

  static rehydrate(props: DeliveryProps): Delivery {
    return new Delivery(props);
  }

  get id(): string {
    return this.props.id;
  }

  get serviceRecordId(): string {
    return this.props.serviceRecordId;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get assessmentId(): string {
    return this.props.assessmentId;
  }

  get eligibilityStatus(): EligibilityStatus {
    return this.props.eligibilityStatus;
  }

  get occurredAt(): CivilDate {
    return this.props.occurredAt;
  }

  get collectedByPersonId(): string | null {
    return this.props.collectedByPersonId;
  }

  get collectedByMembershipId(): string | null {
    return this.props.collectedByMembershipId;
  }

  get executorName(): string {
    return this.props.executorName;
  }

  get executorRole(): string {
    return this.props.executorRole;
  }

  get exceptionReason(): string | null {
    return this.props.exceptionReason;
  }

  get authorizedBy(): string | null {
    return this.props.authorizedBy;
  }

  get operationKey(): string {
    return this.props.operationKey;
  }

  get fingerprint(): string {
    return this.props.fingerprint;
  }

  get status(): DeliveryStatus {
    return this.props.status;
  }

  markReversed(): void {
    this.props.status = "REVERSED";
  }
}
