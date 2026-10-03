import type { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";

export interface PersonListItem {
  personId: string;
  name: string;
  birthDate: CivilDate | null;
  currentFamilyId: string | null;
  currentFamilyCode: string | null;
}

export interface SearchPersonsOutput {
  items: PersonListItem[];
  page: number;
  pageSize: number;
  total: number;
}
