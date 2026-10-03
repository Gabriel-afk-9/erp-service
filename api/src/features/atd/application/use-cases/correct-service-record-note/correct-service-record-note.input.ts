export interface CorrectServiceRecordNoteInput {
  serviceRecordId: string;
  newNote: string | null;
  reason: string;
  expectedRevision: number;
  performedBy: string;
}
