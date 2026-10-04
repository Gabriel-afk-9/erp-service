import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ReceiptLineInvalidError extends DomainError {
  readonly code = "RECEIPT_LINE_INVALID";

  constructor(detail: string) {
    super(`Invalid receipt line: ${detail}`);
  }
}
