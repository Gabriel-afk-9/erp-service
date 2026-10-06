import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ServiceRecordHasDeliveryError extends DomainError {
  readonly code = "SERVICE_RECORD_HAS_DELIVERY";

  constructor(serviceRecordId: string) {
    super(`Service record has a delivery and cannot be canceled in isolation: ${serviceRecordId}`);
  }
}
