import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { MovementQuantityInvalidError } from "../errors/movement-quantity-invalid.error.js";

export type MovementType = "DONATION_IN" | "TRIAGE_DISCARD" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "OPENING_BALANCE";

export function movementEffect(type: MovementType): 1 | 0 | -1 {
  switch (type) {
    case "DONATION_IN":
    case "ADJUSTMENT_IN":
    case "OPENING_BALANCE":
      return 1;
    case "ADJUSTMENT_OUT":
      return -1;
    case "TRIAGE_DISCARD":
      return 0;
  }
}

export interface StockMovementProps {
  id: string;
  itemId: string;
  unitId: string;
  lotId: string | null;
  receiptLineId: string | null;
  countLineId: string | null;
  type: MovementType;
  quantity: number;
  balanceDelta: number;
  occurredAt: CivilDate;
  recordedBy: string;
  reason: string | null;
  operationKey: string | null;
}

export interface NewStockMovementProps {
  itemId: string;
  unitId: string;
  lotId?: string | null;
  receiptLineId?: string | null;
  countLineId?: string | null;
  type: MovementType;
  quantity: number;
  occurredAt: CivilDate;
  recordedBy: string;
  reason?: string | null;
  operationKey?: string | null;
}

export class StockMovement {
  private constructor(private props: StockMovementProps) {}

  static create(input: NewStockMovementProps): StockMovement {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      throw new MovementQuantityInvalidError(input.quantity);
    }
    return new StockMovement({
      id: Id.generate(),
      itemId: input.itemId,
      unitId: input.unitId,
      lotId: input.lotId ?? null,
      receiptLineId: input.receiptLineId ?? null,
      countLineId: input.countLineId ?? null,
      type: input.type,
      quantity: input.quantity,
      balanceDelta: movementEffect(input.type) * input.quantity,
      occurredAt: input.occurredAt,
      recordedBy: input.recordedBy,
      reason: input.reason?.trim()?.slice(0, 500) || null,
      operationKey: input.operationKey ?? null,
    });
  }

  static rehydrate(props: StockMovementProps): StockMovement {
    return new StockMovement(props);
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

  get lotId(): string | null {
    return this.props.lotId;
  }

  get receiptLineId(): string | null {
    return this.props.receiptLineId;
  }

  get countLineId(): string | null {
    return this.props.countLineId;
  }

  get type(): MovementType {
    return this.props.type;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get balanceDelta(): number {
    return this.props.balanceDelta;
  }

  get occurredAt(): CivilDate {
    return this.props.occurredAt;
  }

  get recordedBy(): string {
    return this.props.recordedBy;
  }

  get reason(): string | null {
    return this.props.reason;
  }

  get operationKey(): string | null {
    return this.props.operationKey;
  }
}
