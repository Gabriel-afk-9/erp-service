import type { ServiceRecord } from "../../../atd/domain/entities/service-record.entity.js";
import type { StockMovement } from "../../../inventory/domain/entities/stock-movement.entity.js";
import type { Delivery } from "../entities/delivery.entity.js";
import type { DeliveryLine } from "../entities/delivery-line.entity.js";
import type { DeliveryReversal } from "../entities/delivery-reversal.entity.js";

export interface DeliveryFilters {
  familyId?: string;
  from?: string;
  to?: string;
}

export interface ServiceRecordAudit {
  performedBy: string;
  before: unknown;
  after: unknown;
  reason: string | null;
}

export interface ConfirmBundle {
  record: ServiceRecord;
  delivery: Delivery;
  lines: DeliveryLine[];
  movements: StockMovement[];
}

export interface ReverseBundle {
  delivery: Delivery;
  record: ServiceRecord;
  reversal: DeliveryReversal;
  movements: StockMovement[];
}

export interface DeliveryRepository {
  findById(id: string): Promise<Delivery | null>;
  findByOperationKey(operationKey: string): Promise<Delivery | null>;
  findByServiceRecordId(serviceRecordId: string): Promise<Delivery | null>;
  findLinesByDeliveryId(deliveryId: string): Promise<DeliveryLine[]>;
  findReversalByDeliveryId(deliveryId: string): Promise<DeliveryReversal | null>;
  list(filters: DeliveryFilters): Promise<Delivery[]>;
  confirmFull(bundle: ConfirmBundle, audit: ServiceRecordAudit): Promise<void>;
  reverseFull(bundle: ReverseBundle, audit: ServiceRecordAudit): Promise<void>;
}
