import type { StockMovement } from "../entities/stock-movement.entity.js";

export interface MovementRepository {
  append(movement: StockMovement): Promise<void>;
  findByOperationKey(operationKey: string): Promise<StockMovement | null>;
  hasOpeningBalance(itemId: string): Promise<boolean>;
  sumDeltaByItem(itemId: string, to?: string): Promise<number>;
  sumDeltaByLot(lotId: string, to?: string): Promise<number>;
  listByItem(itemId: string, to?: string): Promise<StockMovement[]>;
}
