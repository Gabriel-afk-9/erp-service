export interface AdjustStockInput {
  itemId: string;
  lotId?: string | null;
  quantity: number;
  direction: "IN" | "OUT";
  reason: string;
  occurredAt?: string;
  operationKey: string;
  actorId: string;
}
