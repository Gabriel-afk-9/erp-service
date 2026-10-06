import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";

export interface DeliveryLineProps {
  id: string;
  deliveryId: string;
  stockLotId: string;
  unitId: string;
  quantity: number;
}

export class DeliveryLine {
  private constructor(private props: DeliveryLineProps) {}

  static create(input: { deliveryId: string; stockLotId: string; unitId: string; quantity: number }): DeliveryLine {
    return new DeliveryLine({ id: Id.generate(), ...input });
  }

  static rehydrate(props: DeliveryLineProps): DeliveryLine {
    return new DeliveryLine(props);
  }

  get id(): string {
    return this.props.id;
  }

  get deliveryId(): string {
    return this.props.deliveryId;
  }

  get stockLotId(): string {
    return this.props.stockLotId;
  }

  get unitId(): string {
    return this.props.unitId;
  }

  get quantity(): number {
    return this.props.quantity;
  }
}
