export interface AddFamilyMemberInput {
  familyId: string;
  personId: string;
  validFrom: string;
  relationshipToReference?: string | null;
  isReference: boolean;
  actorId: string;
}
