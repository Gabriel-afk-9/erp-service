import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class PersonNotMemberAtDateError extends DomainError {
  readonly code = "PERSON_NOT_MEMBER_AT_DATE";

  constructor(personId: string, date: string) {
    super(`Person has no membership in the family on this date: ${personId} @ ${date}`);
  }
}
