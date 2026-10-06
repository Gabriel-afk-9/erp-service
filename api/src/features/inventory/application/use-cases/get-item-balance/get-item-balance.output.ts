export interface GetItemBalanceOutput {
  itemId: string;
  onHand: number;
  available: number;
  lots: Array<{
    lotId: string;
    expiresOn: string | null;
    onHand: number;
    status: "AVAILABLE" | "EXPIRED" | "EMPTY";
  }>;
}
