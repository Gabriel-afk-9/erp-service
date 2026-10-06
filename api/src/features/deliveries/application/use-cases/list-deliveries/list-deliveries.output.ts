export interface ListDeliveriesOutput {
  deliveries: Array<{ deliveryId: string; familyId: string; occurredAt: string; status: string }>;
}

