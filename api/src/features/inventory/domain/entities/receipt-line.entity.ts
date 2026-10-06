import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { ReceiptLineInvalidError } from "../errors/receipt-line-invalid.error.js";

export interface ReceiptLineProps {
  id: string;
  receiptId: string;
  itemId: string;
  unitId: string;
  informedQuantity: number | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason: string | null;
  expiresOn: string | null;
}

export interface NewReceiptLineProps {
  receiptId: string;
  itemId: string;
  unitId: string;
  informedQuantity?: number | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
  expiresOn?: string | null;
}

function requireNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ReceiptLineInvalidError(`${field} must be zero or positive, got ${value}`);
  }
}

export class ReceiptLine {
  private constructor(private props: ReceiptLineProps) {}

  static create(input: NewReceiptLineProps): ReceiptLine {
    requireNonNegative(input.receivedQuantity, "receivedQuantity");
    requireNonNegative(input.acceptedQuantity, "acceptedQuantity");
    requireNonNegative(input.rejectedQuantity, "rejectedQuantity");
    if (input.acceptedQuantity + input.rejectedQuantity !== input.receivedQuantity) {
      throw new ReceiptLineInvalidError(
        `accepted (${input.acceptedQuantity}) + rejected (${input.rejectedQuantity}) must equal received (${input.receivedQuantity})`,
      );
    }
    if (input.rejectedQuantity > 0 && (input.rejectionReason ?? "").trim().length === 0) {
      throw new ReceiptLineInvalidError("rejectionReason is required when rejectedQuantity is positive");
    }
    if (input.informedQuantity !== undefined && input.informedQuantity !== null && input.informedQuantity < 0) {
      throw new ReceiptLineInvalidError("informedQuantity must be zero or positive");
    }
    return new ReceiptLine({
      id: Id.generate(),
      receiptId: input.receiptId,
      itemId: input.itemId,
      unitId: input.unitId,
      informedQuantity: input.informedQuantity ?? null,
      receivedQuantity: input.receivedQuantity,
      acceptedQuantity: input.acceptedQuantity,
      rejectedQuantity: input.rejectedQuantity,
      rejectionReason: input.rejectionReason?.trim()?.slice(0, 500) || null,
      expiresOn: input.expiresOn ?? null,
    });
  }

  static rehydrate(props: ReceiptLineProps): ReceiptLine {
    return new ReceiptLine(props);
  }

  get id(): string {
    return this.props.id;
  }

  get receiptId(): string {
    return this.props.receiptId;
  }

  get itemId(): string {
    return this.props.itemId;
  }

  get unitId(): string {
    return this.props.unitId;
  }

  get informedQuantity(): number | null {
    return this.props.informedQuantity;
  }

  get receivedQuantity(): number {
    return this.props.receivedQuantity;
  }

  get acceptedQuantity(): number {
    return this.props.acceptedQuantity;
  }

  get rejectedQuantity(): number {
    return this.props.rejectedQuantity;
  }

  get rejectionReason(): string | null {
    return this.props.rejectionReason;
  }

  get expiresOn(): string | null {
    return this.props.expiresOn;
  }
}
