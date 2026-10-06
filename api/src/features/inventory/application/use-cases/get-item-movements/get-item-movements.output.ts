export interface GetItemMovementsOutput {
  itemId: string;
  movements: Array<{
    movementId: string;
    type: string;
    quantity: number;
    balanceDelta: number;
    balanceAfter: number;
    occurredAt: string;
    lotId: string | null;
  }>;
}
