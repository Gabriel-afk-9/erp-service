import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { CountClosedError } from "../errors/count-closed.error.js";
import { CountLineInvalidError } from "../errors/count-line-invalid.error.js";

export type CountStatus = "OPEN" | "CLOSED";

export interface StockCountProps {
  id: string;
  conductedBy: string;
  conductedAt: CivilDate;
  closedAt: CivilDate | null;
  note: string | null;
}

export class StockCount {
  private constructor(private props: StockCountProps) {}

  static create(input: { conductedBy: string; conductedAt: CivilDate; note?: string | null }): StockCount {
    return new StockCount({
      id: Id.generate(),
      conductedBy: input.conductedBy,
      conductedAt: input.conductedAt,
      closedAt: null,
      note: input.note?.trim()?.slice(0, 500) || null,
    });
  }

  static rehydrate(props: StockCountProps): StockCount {
    return new StockCount(props);
  }

  get id(): string {
    return this.props.id;
  }

  get conductedBy(): string {
    return this.props.conductedBy;
  }

  get conductedAt(): CivilDate {
    return this.props.conductedAt;
  }

  get closedAt(): CivilDate | null {
    return this.props.closedAt;
  }

  get note(): string | null {
    return this.props.note;
  }

  get status(): CountStatus {
    return this.props.closedAt === null ? "OPEN" : "CLOSED";
  }

  close(closedAt: CivilDate): void {
    if (this.props.closedAt !== null) {
      throw new CountClosedError(this.props.id);
    }
    this.props.closedAt = closedAt;
  }
}

export interface StockCountLineProps {
  id: string;
  countId: string;
  itemId: string;
  unitId: string;
  lotId: string | null;
  expiresOn: string | null;
  expectedQuantity: number;
  countedQuantity: number;
}

export class StockCountLine {
  private constructor(private props: StockCountLineProps) {}

  static create(input: {
    countId: string;
    itemId: string;
    unitId: string;
    lotId?: string | null;
    expiresOn?: string | null;
    expectedQuantity: number;
    countedQuantity: number;
  }): StockCountLine {
    if (input.expectedQuantity < 0 || input.countedQuantity < 0) {
      throw new CountLineInvalidError("expected and counted quantities must be zero or positive");
    }
    return new StockCountLine({
      id: Id.generate(),
      countId: input.countId,
      itemId: input.itemId,
      unitId: input.unitId,
      lotId: input.lotId ?? null,
      expiresOn: input.expiresOn ?? null,
      expectedQuantity: input.expectedQuantity,
      countedQuantity: input.countedQuantity,
    });
  }

  static rehydrate(props: StockCountLineProps): StockCountLine {
    return new StockCountLine(props);
  }

  get id(): string {
    return this.props.id;
  }

  get countId(): string {
    return this.props.countId;
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

  get expiresOn(): string | null {
    return this.props.expiresOn;
  }

  get expectedQuantity(): number {
    return this.props.expectedQuantity;
  }

  get countedQuantity(): number {
    return this.props.countedQuantity;
  }

  get variance(): number {
    return this.props.countedQuantity - this.props.expectedQuantity;
  }

  recordCounted(quantity: number): void {
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new CountLineInvalidError("countedQuantity must be zero or positive");
    }
    this.props.countedQuantity = quantity;
  }
}
