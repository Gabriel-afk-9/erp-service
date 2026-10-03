import type { GetServiceRecordOutput } from "../get-service-record/get-service-record.output.js";

export interface ListServiceRecordsByFamilyItemOutput extends GetServiceRecordOutput {
  hasHomeVisit: boolean;
}

export interface ListServiceRecordsByFamilyOutput {
  records: ListServiceRecordsByFamilyItemOutput[];
}
