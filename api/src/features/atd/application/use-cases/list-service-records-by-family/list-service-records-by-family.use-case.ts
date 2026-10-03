import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { ServiceRecordRepository } from "../../../domain/repositories/service-record.repository.js";
import type { ListServiceRecordsByFamilyInput } from "./list-service-records-by-family.input.js";
import type {
  ListServiceRecordsByFamilyItemOutput,
  ListServiceRecordsByFamilyOutput,
} from "./list-service-records-by-family.output.js";

export class ListServiceRecordsByFamilyUseCase {
  constructor(private readonly repository: ServiceRecordRepository) {}

  async execute(input: ListServiceRecordsByFamilyInput): Promise<ListServiceRecordsByFamilyOutput> {
    const found = await this.repository.findByFamily(input.familyId, {
      from: input.from === undefined ? undefined : CivilDate.from(input.from),
      to: input.to === undefined ? undefined : CivilDate.from(input.to),
    });
    const records: ListServiceRecordsByFamilyItemOutput[] = found.map(({ record, homeVisit }) => ({
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
      status: record.status,
      revision: record.revision,
      hasHomeVisit: homeVisit !== null,
      homeVisit: homeVisit === null ? null : { observedSituation: homeVisit.observedSituation },
    }));
    records.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));
    return { records };
  }
}
