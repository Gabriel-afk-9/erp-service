import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ReceiptNotFoundError extends DomainError {
  readonly code = "RECEIPT_NOT_FOUND";

  constructor(receiptId: string) {
    super(`Stock receipt not found: ${receiptId}`);
  }
}
