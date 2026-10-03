export interface EndFamilyMembershipInput {
  membershipId: string;
  validUntil: string;
  reason: string;
  expectedRevision: number;
  actorId: string;
}
