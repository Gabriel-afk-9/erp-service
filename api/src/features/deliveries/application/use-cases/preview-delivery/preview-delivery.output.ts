import type { EligibilityStatus } from "../../../../../shared/domain/gateways/eligibility.gateway.js";

export interface PreviewDeliveryOutput {
  familyId: string;
  referenceDate: string;
  eligibilityStatus: EligibilityStatus;
  pendingReason: string | null;
  justificationRequired: boolean;
  previousDeliveries: Array<{ deliveryId: string; occurredAt: string; status: string }>;
}

