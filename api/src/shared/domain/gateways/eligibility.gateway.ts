// Aptidao calculada pela frente FRQ (APT) — AD nao recalcula, apenas consulta.
// Implementacao atual: PendingEligibilityGateway — retorna PENDING (RN-18/LAC-01).

export type EligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "PENDING";

export interface EligibilityEvidence {
  personId: string;
  activityId: string;
  periodStart: string;
  periodEndExclusive: string;
  presenceCount: number;
}

export interface EligibilityAssessment {
  assessmentId: string;
  familyId: string;
  referenceDate: string;
  evaluatedAt: string;
  status: EligibilityStatus;
  policyId: string | null;
  pendingReason: string | null;
  evidences: EligibilityEvidence[];
}

export interface EligibilityGateway {
  evaluate(familyId: string, referenceDate: string): Promise<EligibilityAssessment>;
}
