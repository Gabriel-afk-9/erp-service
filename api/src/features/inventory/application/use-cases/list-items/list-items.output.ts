export interface ItemListItem {
  itemId: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitSymbol: string;
  requiresExpiration: boolean;
  isActive: boolean;
  revision: number;
}

export interface ListItemsOutput {
  items: ItemListItem[];
}
