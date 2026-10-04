export interface RecordCountLineInput {
  countId: string;
  lotId?: string | null;
  itemId?: string;
  unitId?: string;
  expiresOn?: string | null;
  countedQuantity: number;
}
