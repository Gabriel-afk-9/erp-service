import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";

export interface DeliveryReversalProps {
  id: string;
  deliveryId: string;
  reason: string;
  reversedAt: CivilDate;
  reversedBy: string;
}

export class DeliveryReversal {
  private constructor(private props: DeliveryReversalProps) {}

  static create(input: { deliveryId: string; reason: string; reversedAt: CivilDate; reversedBy: string }): DeliveryReversal {
    return new DeliveryReversal({ id: Id.generate(), ...input });
  }

  static rehydrate(props: DeliveryReversalProps): DeliveryReversal {
    return new DeliveryReversal(props);
  }

  get id(): string {
    return this.props.id;
  }

  get deliveryId(): string {
    return this.props.deliveryId;
  }

  get reason(): string {
    return this.props.reason;
  }

  get reversedAt(): CivilDate {
    return this.props.reversedAt;
  }

  get reversedBy(): string {
    return this.props.reversedBy;
  }
}
