export interface FamilyListItem {
  familyId: string;
  code: string;
  referenceName: string | null;
  neighborhood: string | null;
  memberCount: number;
}

export interface SearchFamiliesOutput {
  items: FamilyListItem[];
  page: number;
  pageSize: number;
  total: number;
}
