import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class EligibilityJustificationRequiredError extends DomainError {
  readonly code = "ELIGIBILITY_JUSTIFICATION_REQUIRED";

  constructor(status: string) {
    super(`Family eligibility is ${status}: exceptionReason and authorizedBy are required`);
  }
}
