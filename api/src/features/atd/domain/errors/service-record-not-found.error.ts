import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ServiceRecordNotFoundError extends DomainError {
  readonly code = "SERVICE_RECORD_NOT_FOUND";

  constructor(serviceRecordId: string) {
    super(`Service record not found: ${serviceRecordId}`);
  }
}
