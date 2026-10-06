import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class ReportChangedError extends DomainError {
  readonly code = "REPORT_CHANGED";

  constructor() {
    super("Report sources changed since the totals were generated; refresh the report");
  }
}
