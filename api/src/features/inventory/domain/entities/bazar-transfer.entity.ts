import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";

export interface BazarTransferProps {
  id: string;
  receiptId: string;
  externalReference: string;
}

export function normalizeExternalReference(value: string): string {
  return value.trim().slice(0, 200);
}

export class BazarTransfer {
  private constructor(private props: BazarTransferProps) {}

  static create(input: { receiptId: string; externalReference: string }): BazarTransfer {
    return new BazarTransfer({
      id: Id.generate(),
      receiptId: input.receiptId,
      externalReference: normalizeExternalReference(input.externalReference),
    });
  }

  static rehydrate(props: BazarTransferProps): BazarTransfer {
    return new BazarTransfer(props);
  }

  get id(): string {
    return this.props.id;
  }

  get receiptId(): string {
    return this.props.receiptId;
  }

  get externalReference(): string {
    return this.props.externalReference;
  }
}
