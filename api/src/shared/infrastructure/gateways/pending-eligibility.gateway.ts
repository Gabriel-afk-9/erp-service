// Retorna PENDING conforme RN-18: sem politica configurada, toda familia fica Pendente.
// LAC-01 define o criterio de frequencia minima. Enquanto aberto, este e o comportamento
// correto — nao uma limitacao tecnica provisoria.
// Substituir por adapter real quando a frente FRQ/APT entregar o contrato de evaluate().

import { randomUUID } from "node:crypto";
import type {
  EligibilityAssessment,
  EligibilityGateway,
} from "../../domain/gateways/eligibility.gateway.js";

export class PendingEligibilityGateway implements EligibilityGateway {
  async evaluate(familyId: string, referenceDate: string): Promise<EligibilityAssessment> {
    return {
      assessmentId: randomUUID(),
      familyId,
      referenceDate,
      evaluatedAt: new Date().toISOString(),
      status: "PENDING",
      policyId: null,
      pendingReason: "Nenhuma politica de aptidao configurada",
      evidences: [],
    };
  }
}
