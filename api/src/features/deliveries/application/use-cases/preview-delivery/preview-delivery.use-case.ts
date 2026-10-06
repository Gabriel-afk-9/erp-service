import type { EligibilityGateway } from "../../../../../shared/domain/gateways/eligibility.gateway.js";
import type { RegistryGateway } from "../../../../../shared/domain/gateways/registry.gateway.js";
import { FamilyNotFoundError } from "../../../../atd/domain/errors/family-not-found.error.js";
import type { DeliveryRepository } from "../../../domain/repositories/delivery.repository.js";
import type { PreviewDeliveryInput } from "./preview-delivery.input.js";
import type { PreviewDeliveryOutput } from "./preview-delivery.output.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class PreviewDeliveryUseCase {
  constructor(
    private readonly deliveries: DeliveryRepository,
    private readonly registry: RegistryGateway,
    private readonly eligibility: EligibilityGateway,
  ) {}

  async execute(input: PreviewDeliveryInput): Promise<PreviewDeliveryOutput> {
    const referenceDate = input.referenceDate ?? today();
    const family = await this.registry.findFamily(input.familyId);
    if (family === null) {
      throw new FamilyNotFoundError(input.familyId);
    }
    // Strictly read-only: no locks, no pending state, nothing is created.
    const assessment = await this.eligibility.evaluate(input.familyId, referenceDate);
    const previous = await this.deliveries.list({ familyId: input.familyId });
    return {
      familyId: input.familyId,
      referenceDate,
      eligibilityStatus: assessment.status,
      pendingReason: assessment.pendingReason,
      justificationRequired: assessment.status !== "ELIGIBLE",
      previousDeliveries: previous.map((delivery) => ({
        deliveryId: delivery.id,
        occurredAt: delivery.occurredAt,
        status: delivery.status,
      })),
    };
  }
}

