export interface CorrectPersonInput {
  personId: string;
  name?: string;
  contactPhone?: string | null;
  occupation?: string | null;
  educationLevel?: string | null;
  reason: string;
  expectedRevision: number;
  actorId: string;
}
