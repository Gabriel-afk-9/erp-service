import { DomainError } from "./domain.error.js";

export class InvalidCredentialsError extends DomainError {
  readonly code = "INVALID_CREDENTIALS";

  constructor() {
    super("Invalid login or password");
  }
}
