import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ReceiptOperationConflictError extends DomainError {
  readonly code = "RECEIPT_OPERATION_CONFLICT";

  constructor(operationKey: string) {
    super(`Operation key already used with different content: ${operationKey}`);
  }
}
