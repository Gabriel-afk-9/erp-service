import { ServiceRecordNotFoundError } from "../../../domain/errors/service-record-not-found.error.js";
import type { ServiceRecordRepository } from "../../../domain/repositories/service-record.repository.js";
import type { GetServiceRecordInput } from "./get-service-record.input.js";
import type { GetServiceRecordOutput } from "./get-service-record.output.js";

export class GetServiceRecordUseCase {
  constructor(private readonly repository: ServiceRecordRepository) {}

  async execute(input: GetServiceRecordInput): Promise<GetServiceRecordOutput> {
    const found = await this.repository.findById(input.serviceRecordId);
    if (found === null) {
      throw new ServiceRecordNotFoundError(input.serviceRecordId);
    }
    const { record, homeVisit } = found;
    return {
      serviceRecordId: record.id,
      activityId: record.activityId,
      serviceTypeName: record.serviceTypeName,
      familyId: record.familyId,
      personId: record.personId,
      executorName: record.executor.executorName,
      executorRole: record.executor.executorRole,
      occurredAt: record.occurredAt,
      recordedAt: record.recordedAt,
      recordedBy: record.recordedBy,
      note: record.note,
      cancelReason: record.cancelReason,
      status: record.status,
      revision: record.revision,
      homeVisit: homeVisit === null ? null : { observedSituation: homeVisit.observedSituation },
    };
  }
}
