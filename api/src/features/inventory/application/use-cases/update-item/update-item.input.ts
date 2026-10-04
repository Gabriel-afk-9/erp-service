export interface UpdateItemInput {
  itemId: string;
  name?: string;
  description?: string | null;
  requiresExpiration?: boolean;
  reason: string;
  expectedRevision: number;
}
