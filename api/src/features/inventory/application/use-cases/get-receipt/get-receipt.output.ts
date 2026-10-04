export interface GetReceiptOutput {
  receiptId: string;
  originType: string;
  donorName: string | null;
  receivedBy: string;
  receivedAt: string;
  note: string | null;
  lines: Array<{
    lineId: string;
    itemId: string;
    itemName: string;
    unitSymbol: string;
    informedQuantity: number | null;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    rejectionReason: string | null;
    expiresOn: string | null;
    lotId: string | null;
  }>;
}
