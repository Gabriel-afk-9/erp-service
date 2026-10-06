export interface ListItemsWithBalanceOutput {
  items: Array<{
    itemId: string;
    name: string;
    categoryName: string;
    unitSymbol: string;
    requiresExpiration: boolean;
    isActive: boolean;
    onHand: number;
    available: number;
  }>;
}
