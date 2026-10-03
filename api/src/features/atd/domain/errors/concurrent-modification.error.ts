import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ConcurrentModificationError extends DomainError {
  readonly code = "CONCURRENT_MODIFICATION";

  constructor(expectedRevision: number, currentRevision: number) {
    super(`Revision conflict: expected ${expectedRevision}, current is ${currentRevision}`);
  }
}
