import type { LocationType } from "../../../domain/entities/family.entity.js";

export interface CreateFamilyInput {
  referenceName?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  locationType: LocationType;
  contactPhone?: string | null;
  actorId: string;
}
