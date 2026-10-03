import type { FamilyRepository } from "./family.repository.js";
import type { MembershipRepository } from "./membership.repository.js";
import type { PersonRepository } from "./person.repository.js";
import type { RegistrationAuditRecorder } from "./registration-audit.js";

export interface RegistrationStores {
  families: FamilyRepository;
  persons: PersonRepository;
  memberships: MembershipRepository;
  audits: RegistrationAuditRecorder;
}

export interface RegistrationUnitOfWork {
  transactional<T>(work: (stores: RegistrationStores) => Promise<T>): Promise<T>;
}
