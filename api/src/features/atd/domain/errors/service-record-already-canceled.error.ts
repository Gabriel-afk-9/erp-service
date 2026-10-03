import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ServiceRecordAlreadyCanceledError extends DomainError {
  readonly code = "SERVICE_RECORD_ALREADY_CANCELED";

  constructor(serviceRecordId: string) {
    super(`Service record is already canceled: ${serviceRecordId}`);
  }
}
