import { deriveLotStatus, type LotStatus } from "../../domain/entities/stock-lot.entity.js";
import type { LotRepository } from "../../domain/repositories/lot.repository.js";
import type { MovementRepository } from "../../domain/repositories/movement.repository.js";

export interface LotBalance {
  lotId: string;
  itemId: string;
  unitId: string;
  expiresOn: string | null;
  onHand: number;
  status: LotStatus;
}

export interface ItemBalance {
  onHand: number;
  available: number;
  lots: LotBalance[];
}

export class BalanceCalculator {
  constructor(
    private readonly lots: LotRepository,
    private readonly movements: MovementRepository,
  ) {}

  async forItem(itemId: string, referenceDate: string, to?: string): Promise<ItemBalance> {
    const lots = await this.lots.findByItem(itemId);
    const balances: LotBalance[] = await Promise.all(
      lots.map(async (lot) => {
        const onHand = await this.movements.sumDeltaByLot(lot.id, to);
        return {
          lotId: lot.id,
          itemId: lot.itemId,
          unitId: lot.unitId,
          expiresOn: lot.expiresOn,
          onHand,
          status: deriveLotStatus(lot.expiresOn, referenceDate, onHand),
        };
      }),
    );
    const onHand = balances.reduce((sum, lot) => sum + lot.onHand, 0);
    const available = balances
      .filter((lot) => lot.status === "AVAILABLE")
      .reduce((sum, lot) => sum + lot.onHand, 0);
    return { onHand, available, lots: balances };
  }

  async onHandByLot(lotId: string, to?: string): Promise<number> {
    return this.movements.sumDeltaByLot(lotId, to);
  }
}
