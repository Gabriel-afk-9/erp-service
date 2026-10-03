import type { LocationType } from "../../../domain/entities/family.entity.js";

export interface CorrectFamilyInput {
  familyId: string;
  referenceName?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  locationType?: LocationType;
  contactPhone?: string | null;
  reason: string;
  expectedRevision: number;
  actorId: string;
}
