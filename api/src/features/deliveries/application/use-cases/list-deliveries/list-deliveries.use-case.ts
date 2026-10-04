import type { DeliveryRepository } from "../../../domain/repositories/delivery.repository.js";
import type { ListDeliveriesInput } from "./list-deliveries.input.js";
import type { ListDeliveriesOutput } from "./list-deliveries.output.js";

export class ListDeliveriesUseCase {
  constructor(private readonly deliveries: DeliveryRepository) {}

  async execute(input: ListDeliveriesInput): Promise<ListDeliveriesOutput> {
    const deliveries = await this.deliveries.list(input);
    return {
      deliveries: deliveries.map((delivery) => ({
        deliveryId: delivery.id,
        familyId: delivery.familyId,
        occurredAt: delivery.occurredAt,
        status: delivery.status,
      })),
    };
  }
}

