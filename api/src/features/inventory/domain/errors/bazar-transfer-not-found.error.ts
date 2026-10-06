import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class BazarTransferNotFoundError extends DomainError {
  readonly code = "BAZAR_TRANSFER_NOT_FOUND";

  constructor(transferId: string) {
    super(`Bazar transfer not found: ${transferId}`);
  }
}
