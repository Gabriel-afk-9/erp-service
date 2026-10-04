export interface GetItemOutput {
  itemId: string;
  name: string;
  description: string | null;
  requiresExpiration: boolean;
  isActive: boolean;
  revision: number;
  category: { categoryId: string; name: string };
  unit: { unitId: string; symbol: string; name: string; decimalPlaces: number; quantityIncrement: number };
}
