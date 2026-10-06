import { ConcurrentModificationError } from "../../../domain/errors/concurrent-modification.error.js";
import { ReasonRequiredError } from "../../../domain/errors/reason-required.error.js";
import { ServiceRecordHasDeliveryError } from "../../../domain/errors/service-record-has-delivery.error.js";
import { ServiceRecordNotFoundError } from "../../../domain/errors/service-record-not-found.error.js";
import type { ServiceRecordRepository } from "../../../domain/repositories/service-record.repository.js";
import type { CancelServiceRecordInput } from "./cancel-service-record.input.js";
import type { CancelServiceRecordOutput } from "./cancel-service-record.output.js";

export class CancelServiceRecordUseCase {
  constructor(
    private readonly repository: ServiceRecordRepository,
    private readonly checkNoDelivery: ((serviceRecordId: string) => Promise<boolean>) | null = null,
  ) {}

  async execute(input: CancelServiceRecordInput): Promise<CancelServiceRecordOutput> {
    if (input.reason.trim().length < 3) {
      throw new ReasonRequiredError();
    }
    const found = await this.repository.findById(input.serviceRecordId);
    if (found === null) {
      throw new ServiceRecordNotFoundError(input.serviceRecordId);
    }
    if (this.checkNoDelivery !== null) {
      const hasNoDelivery = await this.checkNoDelivery(input.serviceRecordId);
      if (!hasNoDelivery) {
        throw new ServiceRecordHasDeliveryError(input.serviceRecordId);
      }
    }
    const { record } = found;
    if (record.revision !== input.expectedRevision) {
      throw new ConcurrentModificationError(input.expectedRevision, record.revision);
    }
    const before = { status: record.status, revision: record.revision };
    record.cancel(input.reason.trim());
    await this.repository.save(record, found.homeVisit, {
      operation: "CANCELED",
      performedBy: input.performedBy,
      before,
      after: { status: record.status, revision: record.revision },
      reason: input.reason.trim(),
    });
    return { serviceRecordId: record.id, status: "CANCELED", revision: record.revision };
  }
}
