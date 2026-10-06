import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class DeliveryNotFoundError extends DomainError {
  readonly code = "DELIVERY_NOT_FOUND";

  constructor(deliveryId: string) {
    super(`Delivery not found: ${deliveryId}`);
  }
}
