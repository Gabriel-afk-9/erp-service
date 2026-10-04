export interface ListReceiptsOutput {
  receipts: Array<{
    receiptId: string;
    originType: string;
    donorName: string | null;
    receivedAt: string;
  }>;
}
