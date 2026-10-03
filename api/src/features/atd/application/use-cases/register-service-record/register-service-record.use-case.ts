import { DomainError } from "../../../../../shared/domain/errors/domain.error.js";
import type { ActivityGateway } from "../../../../../shared/domain/gateways/activity.gateway.js";
import type { RegistryGateway } from "../../../../../shared/domain/gateways/registry.gateway.js";
import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Id } from "../../../../../shared/domain/value-objects/id.value-object.js";
import { Instant } from "../../../../../shared/domain/value-objects/instant.value-object.js";
import { HomeVisit } from "../../../domain/entities/home-visit.entity.js";
import { ServiceRecord } from "../../../domain/entities/service-record.entity.js";
import { FamilyNotFoundError } from "../../../domain/errors/family-not-found.error.js";
import { HomeVisitNotAllowedError } from "../../../domain/errors/home-visit-not-allowed.error.js";
import { HomeVisitRequiredError } from "../../../domain/errors/home-visit-required.error.js";
import { PersonNotMemberAtDateError } from "../../../domain/errors/person-not-member-at-date.error.js";
import type { ServiceRecordRepository } from "../../../domain/repositories/service-record.repository.js";
import { createExecutorInfo } from "../../../domain/value-objects/executor-info.value-object.js";
import type { RegisterServiceRecordInput } from "./register-service-record.input.js";
import type { RegisterServiceRecordOutput } from "./register-service-record.output.js";

export class DonationTypeNotAllowedError extends DomainError {
  readonly code = "DONATION_TYPE_NOT_ALLOWED";

  constructor() {
    super("Item donation services must be registered through a delivery, not directly");
  }
}

const HOME_VISIT_SERVICE_TYPE_CODE = "HOME_VISIT";
const DONATION_SERVICE_TYPE_CODE = "ITEM_DONATION";

export class RegisterServiceRecordUseCase {
  constructor(
    private readonly repository: ServiceRecordRepository,
    private readonly registry: RegistryGateway,
    private readonly activity: ActivityGateway,
  ) {}

  async execute(input: RegisterServiceRecordInput): Promise<RegisterServiceRecordOutput> {
    const activity = await this.activity.requireOneOffActivity(input.activityId);

    if (activity.serviceType.code === DONATION_SERVICE_TYPE_CODE) {
      throw new DonationTypeNotAllowedError();
    }

    const isHomeVisitActivity = activity.serviceType.code === HOME_VISIT_SERVICE_TYPE_CODE;
    if (isHomeVisitActivity && input.homeVisit === null) {
      throw new HomeVisitRequiredError();
    }
    if (!isHomeVisitActivity && input.homeVisit !== null) {
      throw new HomeVisitNotAllowedError();
    }

    const family = await this.registry.findFamily(input.familyId);
    if (family === null) {
      throw new FamilyNotFoundError(input.familyId);
    }

    const occurredAt = CivilDate.from(input.occurredAt);

    let membershipId: string | null = null;
    if (input.personId !== null) {
      const membership = await this.registry.resolveMembership(input.personId, occurredAt);
      if (membership === null || membership.familyId !== input.familyId) {
        throw new PersonNotMemberAtDateError(input.personId, occurredAt);
      }
      membershipId = membership.membershipId;
    }

    const record = ServiceRecord.create({
      id: Id.generate(),
      activityId: activity.activityId,
      serviceTypeId: activity.serviceType.serviceTypeId,
      serviceTypeName: activity.serviceType.name,
      familyId: input.familyId,
      personId: input.personId,
      membershipId,
      executor: createExecutorInfo(input.executorName, input.executorRole),
      occurredAt,
      recordedAt: Instant.now(),
      recordedBy: input.recordedBy,
      note: input.note,
    });

    let homeVisit: HomeVisit | null = null;
    if (input.homeVisit !== null) {
      homeVisit = HomeVisit.create({
        id: Id.generate(),
        serviceRecordId: record.id,
        observedSituation: input.homeVisit.observedSituation,
      });
    }

    await this.repository.save(record, homeVisit, {
      operation: "CREATED",
      performedBy: input.recordedBy,
      before: null,
      after: { status: record.status, revision: record.revision },
      reason: null,
    });

    return {
      serviceRecordId: record.id,
      occurredAt: record.occurredAt,
      recordedAt: record.recordedAt,
      familyId: record.familyId,
      personId: record.personId,
      serviceTypeName: record.serviceTypeName,
      executorName: record.executor.executorName,
      status: "COMPLETED",
      hasHomeVisit: homeVisit !== null,
    };
  }
}
