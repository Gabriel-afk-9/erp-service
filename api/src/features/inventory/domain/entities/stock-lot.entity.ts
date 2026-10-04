import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";

export type LotStatus = "AVAILABLE" | "EXPIRED" | "EMPTY";

export interface StockLotProps {
  id: string;
  itemId: string;
  unitId: string;
  receiptLineId: string | null;
  countLineId: string | null;
  expiresOn: string | null;
}

export interface NewStockLotProps {
  itemId: string;
  unitId: string;
  receiptLineId?: string | null;
  countLineId?: string | null;
  expiresOn?: string | null;
}

export function deriveLotStatus(expiresOn: string | null, referenceDate: string, onHand: number): LotStatus {
  if (onHand <= 0) return "EMPTY";
  if (expiresOn !== null && expiresOn <= referenceDate) return "EXPIRED";
  return "AVAILABLE";
}

export class StockLot {
  private constructor(private props: StockLotProps) {}

  static create(input: NewStockLotProps): StockLot {
    return new StockLot({
      id: Id.generate(),
      itemId: input.itemId,
      unitId: input.unitId,
      receiptLineId: input.receiptLineId ?? null,
      countLineId: input.countLineId ?? null,
      expiresOn: input.expiresOn ?? null,
    });
  }

  static rehydrate(props: StockLotProps): StockLot {
    return new StockLot(props);
  }

  get id(): string {
    return this.props.id;
  }

  get itemId(): string {
    return this.props.itemId;
  }

  get unitId(): string {
    return this.props.unitId;
  }

  get receiptLineId(): string | null {
    return this.props.receiptLineId;
  }

  get countLineId(): string | null {
    return this.props.countLineId;
  }

  get expiresOn(): string | null {
    return this.props.expiresOn;
  }
}
