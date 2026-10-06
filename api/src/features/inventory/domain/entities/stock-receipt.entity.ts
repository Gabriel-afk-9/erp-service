import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";

export type DonationOrigin = "PERSON" | "ORGANIZATION" | "CAMPAIGN" | "BAZAR" | "AD_HOC" | "UNKNOWN";

export interface StockReceiptProps {
  id: string;
  originType: DonationOrigin;
  donorName: string | null;
  receivedBy: string;
  receivedAt: CivilDate;
  note: string | null;
  operationKey: string;
  fingerprint: string;
}

export interface NewStockReceiptProps {
  originType: DonationOrigin;
  donorName?: string | null;
  receivedBy: string;
  receivedAt: CivilDate;
  note?: string | null;
  operationKey: string;
  fingerprint: string;
}

export class StockReceipt {
  private constructor(private props: StockReceiptProps) {}

  static create(input: NewStockReceiptProps): StockReceipt {
    return new StockReceipt({
      id: Id.generate(),
      originType: input.originType,
      donorName: input.donorName?.trim()?.slice(0, 200) || null,
      receivedBy: input.receivedBy,
      receivedAt: input.receivedAt,
      note: input.note?.trim()?.slice(0, 500) || null,
      operationKey: input.operationKey,
      fingerprint: input.fingerprint,
    });
  }

  static rehydrate(props: StockReceiptProps): StockReceipt {
    return new StockReceipt(props);
  }

  get id(): string {
    return this.props.id;
  }

  get originType(): DonationOrigin {
    return this.props.originType;
  }

  get donorName(): string | null {
    return this.props.donorName;
  }

  get receivedBy(): string {
    return this.props.receivedBy;
  }

  get receivedAt(): CivilDate {
    return this.props.receivedAt;
  }

  get note(): string | null {
    return this.props.note;
  }

  get operationKey(): string {
    return this.props.operationKey;
  }

  get fingerprint(): string {
    return this.props.fingerprint;
  }
}
