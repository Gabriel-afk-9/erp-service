import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class MembershipNotFoundError extends DomainError {
  readonly code = "MEMBERSHIP_NOT_FOUND";

  constructor(membershipId: string) {
    super(`Membership not found: ${membershipId}`);
  }
}
