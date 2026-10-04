export interface CreateItemInput {
  categoryId: string;
  unitId: string;
  name: string;
  description?: string | null;
  requiresExpiration: boolean;
}
