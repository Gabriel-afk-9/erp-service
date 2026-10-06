import { createHash } from "node:crypto";
import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Id } from "../../../../../shared/domain/value-objects/id.value-object.js";
import { Instant } from "../../../../../shared/domain/value-objects/instant.value-object.js";
import type { ActivityGateway } from "../../../../../shared/domain/gateways/activity.gateway.js";
import type { EligibilityGateway } from "../../../../../shared/domain/gateways/eligibility.gateway.js";
import type { RegistryGateway } from "../../../../../shared/domain/gateways/registry.gateway.js";
import { ServiceRecord } from "../../../../atd/domain/entities/service-record.entity.js";
import { createExecutorInfo } from "../../../../atd/domain/value-objects/executor-info.value-object.js";
import { FamilyNotFoundError } from "../../../../atd/domain/errors/family-not-found.error.js";
import { Delivery } from "../../../domain/entities/delivery.entity.js";
import { DeliveryLine } from "../../../domain/entities/delivery-line.entity.js";
import { CollectorNotMemberError } from "../../../domain/errors/collector-not-member.error.js";
import { DeliveryLinesInvalidError } from "../../../domain/errors/delivery-lines-invalid.error.js";
import { DeliveryOperationConflictError } from "../../../domain/errors/delivery-operation-conflict.error.js";
import { EligibilityJustificationRequiredError } from "../../../domain/errors/eligibility-justification-required.error.js";
import { InsufficientBalanceError } from "../../../domain/errors/insufficient-balance.error.js";
import type { DeliveryRepository } from "../../../domain/repositories/delivery.repository.js";
import { StockMovement } from "../../../../inventory/domain/entities/stock-movement.entity.js";
import { deriveLotStatus } from "../../../../inventory/domain/entities/stock-lot.entity.js";
import type { ItemRepository } from "../../../../inventory/domain/repositories/item.repository.js";
import type { LotRepository } from "../../../../inventory/domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../../../inventory/domain/repositories/movement.repository.js";
import { isSerializationFailure, isUniqueViolation } from "../../../infrastructure/repositories/prisma-delivery.repository.js";
import type { ConfirmDeliveryInput } from "./confirm-delivery.input.js";
import type { ConfirmDeliveryOutput } from "./confirm-delivery.output.js";

const DONATION_ACTIVITY_ID = "act-donation";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function fingerprintOf(content: unknown): string {
  return createHash("sha256").update(stableStringify(content)).digest("hex");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ConfirmDeliveryUseCase {
  constructor(
    private readonly deliveries: DeliveryRepository,
    private readonly items: ItemRepository,
    private readonly lots: LotRepository,
    private readonly movements: MovementRepository,
    private readonly registry: RegistryGateway,
    private readonly activity: ActivityGateway,
    private readonly eligibility: EligibilityGateway,
  ) {}

  async execute(input: ConfirmDeliveryInput): Promise<ConfirmDeliveryOutput> {
    if (input.lines.length === 0) {
      throw new DeliveryLinesInvalidError("at least one line is required");
    }
    const occurredAt = CivilDate.from(input.occurredAt);
    // Consolidate repeated lots before validating totals (SPEC-ENT section 1).
    const consolidated = new Map<string, number>();
    for (const line of input.lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new DeliveryLinesInvalidError("each line quantity must be positive");
      }
      consolidated.set(line.lotId, (consolidated.get(line.lotId) ?? 0) + line.quantity);
    }
    const fingerprint = fingerprintOf({
      familyId: input.familyId,
      occurredAt: input.occurredAt,
      lines: [...consolidated.entries()].sort(([a], [b]) => (a < b ? -1 : 1)),
      collectedByPersonId: input.collectedByPersonId ?? null,
      executorName: input.executorName,
      executorRole: input.executorRole,
      exceptionReason: input.exceptionReason ?? null,
      authorizedBy: input.authorizedBy ?? null,
    });
    const replay = await this.deliveries.findByOperationKey(input.operationKey);
    if (replay !== null) {
      if (replay.fingerprint !== fingerprint) {
        throw new DeliveryOperationConflictError(input.operationKey);
      }
      return { deliveryId: replay.id, serviceRecordId: replay.serviceRecordId, duplicate: true };
    }
    // Balance and context are re-validated on every retry so a serialization
    // loser rebuilds against fresh state instead of reusing a stale bundle.
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.attempt(input, occurredAt, consolidated, fingerprint);
      } catch (error) {
        if (isUniqueViolation(error)) {
          const winner = await this.deliveries.findByOperationKey(input.operationKey);
          if (winner !== null && winner.fingerprint === fingerprint) {
            return { deliveryId: winner.id, serviceRecordId: winner.serviceRecordId, duplicate: true };
          }
          throw new DeliveryOperationConflictError(input.operationKey);
        }
        if (!isSerializationFailure(error)) throw error;
        lastError = error;
      }
    }
    throw lastError;
  }

  private async attempt(
    input: ConfirmDeliveryInput,
    occurredAt: CivilDate,
    consolidated: Map<string, number>,
    fingerprint: string,
  ): Promise<ConfirmDeliveryOutput> {
    const family = await this.registry.findFamily(input.familyId);
    if (family === null) {
      throw new FamilyNotFoundError(input.familyId);
    }
    const assessment = await this.eligibility.evaluate(input.familyId, input.occurredAt);
    if (assessment.status !== "ELIGIBLE") {
      if ((input.exceptionReason ?? "").trim().length < 3 || (input.authorizedBy ?? "").trim().length === 0) {
        throw new EligibilityJustificationRequiredError(assessment.status);
      }
    }
    let collectedByMembershipId: string | null = null;
    if (input.collectedByPersonId !== undefined && input.collectedByPersonId !== null) {
      const membership = await this.registry.resolveMembership(input.collectedByPersonId, input.occurredAt);
      if (membership === null || membership.familyId !== input.familyId) {
        throw new CollectorNotMemberError(input.collectedByPersonId, input.familyId);
      }
      collectedByMembershipId = membership.membershipId;
    }
    const activity = await this.activity.requireOneOffActivity(DONATION_ACTIVITY_ID);
    const record = ServiceRecord.create({
      id: Id.generate(),
      activityId: activity.activityId,
      serviceTypeId: activity.serviceType.serviceTypeId,
      serviceTypeName: activity.serviceType.name,
      familyId: input.familyId,
      personId: input.collectedByPersonId ?? null,
      membershipId: collectedByMembershipId,
      executor: createExecutorInfo(input.executorName, input.executorRole),
      occurredAt,
      recordedAt: Instant.now(),
      recordedBy: input.actorId,
      note: null,
    });
    const delivery = Delivery.create({
      serviceRecordId: record.id,
      familyId: input.familyId,
      assessmentId: assessment.assessmentId,
      eligibilityStatus: assessment.status,
      occurredAt,
      collectedByPersonId: input.collectedByPersonId ?? null,
      collectedByMembershipId,
      executorName: input.executorName,
      executorRole: input.executorRole,
      exceptionReason: input.exceptionReason ?? null,
      authorizedBy: input.authorizedBy ?? null,
      operationKey: input.operationKey,
      fingerprint,
    });
    const lines: DeliveryLine[] = [];
    const movements: StockMovement[] = [];
    const referenceDate = input.occurredAt > today() ? input.occurredAt : today();
    for (const [lotId, quantity] of consolidated) {
      const lot = await this.lots.findById(lotId);
      if (lot === null) {
        throw new DeliveryLinesInvalidError(`lot not found: ${lotId}`);
      }
      const item = await this.items.findById(lot.itemId);
      if (item === null) {
        throw new DeliveryLinesInvalidError(`item not found for lot: ${lotId}`);
      }
      const onHand = await this.movements.sumDeltaByLot(lotId);
      const status = deriveLotStatus(lot.expiresOn, referenceDate, onHand);
      const available = status === "AVAILABLE" ? onHand : 0;
      if (quantity > available) {
        throw new InsufficientBalanceError(item.name, available, quantity);
      }
      lines.push(DeliveryLine.create({ deliveryId: delivery.id, stockLotId: lotId, unitId: lot.unitId, quantity }));
      movements.push(
        StockMovement.create({
          itemId: lot.itemId,
          unitId: lot.unitId,
          lotId,
          type: "DELIVERY_OUT",
          quantity,
          occurredAt,
          recordedBy: input.actorId,
          reason: `Entrega ${delivery.id}`,
        }),
      );
    }
    await this.deliveries.confirmFull(
      { record, delivery, lines, movements },
      {
        performedBy: input.actorId,
        before: null,
        after: { status: record.status, revision: record.revision },
        reason: null,
      },
    );
    return { deliveryId: delivery.id, serviceRecordId: record.id, duplicate: false };
  }
}

