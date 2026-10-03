import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { FamilyMembership } from "../entities/family-membership.entity.js";

export interface MembershipRepository {
  save(membership: FamilyMembership): Promise<void>;
  findById(id: string): Promise<FamilyMembership | null>;
  findActiveByPerson(personId: string, asOf: CivilDate): Promise<FamilyMembership | null>;
  findActiveByFamily(familyId: string, asOf: CivilDate): Promise<FamilyMembership[]>;
  findAllByFamily(familyId: string): Promise<FamilyMembership[]>;
  findOverlapping(personId: string, from: CivilDate, to: CivilDate | null): Promise<FamilyMembership[]>;
}
