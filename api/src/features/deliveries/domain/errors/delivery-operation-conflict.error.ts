import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class DeliveryOperationConflictError extends DomainError {
  readonly code = "DELIVERY_OPERATION_CONFLICT";

  constructor(operationKey: string) {
    super(`Operation key already used with different content: ${operationKey}`);
  }
}
