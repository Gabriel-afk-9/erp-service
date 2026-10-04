import { DeliveryNotFoundError } from "../../../domain/errors/delivery-not-found.error.js";
import type { DeliveryRepository } from "../../../domain/repositories/delivery.repository.js";
import type { GetDeliveryInput } from "./get-delivery.input.js";
import type { GetDeliveryOutput } from "./get-delivery.output.js";

export class GetDeliveryUseCase {
  constructor(private readonly deliveries: DeliveryRepository) {}

  async execute(input: GetDeliveryInput): Promise<GetDeliveryOutput> {
    const delivery = await this.deliveries.findById(input.deliveryId);
    if (delivery === null) {
      throw new DeliveryNotFoundError(input.deliveryId);
    }
    const [lines, reversal] = await Promise.all([
      this.deliveries.findLinesByDeliveryId(delivery.id),
      this.deliveries.findReversalByDeliveryId(delivery.id),
    ]);
    return {
      deliveryId: delivery.id,
      serviceRecordId: delivery.serviceRecordId,
      familyId: delivery.familyId,
      eligibilityStatus: delivery.eligibilityStatus,
      occurredAt: delivery.occurredAt,
      collectedByPersonId: delivery.collectedByPersonId,
      executorName: delivery.executorName,
      executorRole: delivery.executorRole,
      exceptionReason: delivery.exceptionReason,
      authorizedBy: delivery.authorizedBy,
      status: delivery.status,
      reversal: reversal === null ? null : { reversalId: reversal.id, reason: reversal.reason },
      lines: lines.map((line) => ({ lineId: line.id, stockLotId: line.stockLotId, unitId: line.unitId, quantity: line.quantity })),
    };
  }
}

