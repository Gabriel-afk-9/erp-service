import { DomainError } from "./domain.error.js";

export class TokenExpiredError extends DomainError {
  readonly code = "TOKEN_EXPIRED";

  constructor() {
    super("Token is invalid or expired");
  }
}
