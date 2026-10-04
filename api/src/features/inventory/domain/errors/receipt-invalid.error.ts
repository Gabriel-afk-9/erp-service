import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ReceiptInvalidError extends DomainError {
  readonly code = "RECEIPT_INVALID";

  constructor(detail: string) {
    super(`Invalid stock receipt: ${detail}`);
  }
}
