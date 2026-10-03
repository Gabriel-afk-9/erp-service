import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ExecutorInfoInvalidError extends DomainError {
  readonly code = "EXECUTOR_INFO_INVALID";

  constructor(detail: string) {
    super(`Invalid executor info: ${detail}`);
  }
}
