import type { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { LocationType } from "../../../domain/entities/family.entity.js";

export interface FamilyMemberItem {
  membershipId: string;
  personId: string;
  personName: string;
  relationshipToReference: string | null;
  isReference: boolean;
  validFrom: CivilDate;
  validUntil: CivilDate | null;
  isActive: boolean;
  revision: number;
}

export interface GetFamilyOutput {
  familyId: string;
  code: string;
  referenceName: string | null;
  address: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  locationType: LocationType;
  contactPhone: string | null;
  revision: number;
  memberCount: number;
  members: FamilyMemberItem[];
}
