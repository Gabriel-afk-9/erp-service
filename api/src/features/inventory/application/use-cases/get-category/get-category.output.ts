export interface GetCategoryOutput {
  categoryId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  revision: number;
  items: Array<{
    itemId: string;
    name: string;
    unitSymbol: string;
    requiresExpiration: boolean;
    isActive: boolean;
  }>;
}
