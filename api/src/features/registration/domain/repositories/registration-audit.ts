export type RegistrationEntityType = "Family" | "Person" | "FamilyMembership";

export interface RegistrationAuditInput {
  entityType: RegistrationEntityType;
  entityId: string;
  action: string;
  actorId: string;
  occurredAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
}

export interface RegistrationAuditRecorder {
  recordAudit(input: RegistrationAuditInput): Promise<void>;
}
