export interface CancelServiceRecordOutput {
  serviceRecordId: string;
  status: "CANCELED";
  revision: number;
}
