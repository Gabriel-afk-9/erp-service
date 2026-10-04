import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ReportInvalidPeriodError extends DomainError {
  readonly code = "REPORT_INVALID_PERIOD";

  constructor(from: string, to: string) {
    super(`Invalid report period: from=${from} to=${to} (expected civil dates with from <= to)`);
  }
}
