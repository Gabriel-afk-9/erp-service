import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class CpfFormatError extends DomainError {
  readonly code = "CPF_FORMAT_INVALID";

  constructor() {
    super("Invalid CPF format: expected 11 numeric digits with valid check digits");
  }
}
