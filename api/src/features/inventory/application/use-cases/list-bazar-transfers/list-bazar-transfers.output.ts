export interface ListBazarTransfersOutput {
  transfers: Array<{
    transferId: string;
    externalReference: string;
    receiptId: string;
  }>;
}
