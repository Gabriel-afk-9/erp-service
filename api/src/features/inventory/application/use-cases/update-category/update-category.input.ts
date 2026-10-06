export interface UpdateCategoryInput {
  categoryId: string;
  name?: string;
  description?: string | null;
  reason: string;
  expectedRevision: number;
}
