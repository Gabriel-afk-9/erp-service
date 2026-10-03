// Contrato de identidade — proprietario: modulo BC (CAD).
// AD nao cria Family nem Person. Apenas consulta este gateway.
// Implementacao atual: InMemoryRegistryGateway (dados sinteticos).
// Quando BC entregar, substituir por adapter real sem alterar este contrato.

export interface FamilyAddress {
  street: string;
  neighborhood: string;
  zipCode: string;
  locationType: "URBAN" | "RURAL";
}

export interface FamilySnapshot {
  familyId: string;
  familyNumber: string;
  address: FamilyAddress;
  phone: string | null;
  revision: number;
}

export interface MembershipSnapshot {
  membershipId: string;
  familyId: string;
  personId: string;
  personName: string;
  relationship: string | null;
  isHolder: boolean;
  startDate: string;
  endDate: string | null;
  revision: number;
}

export interface RegistryGateway {
  findFamily(familyId: string): Promise<FamilySnapshot | null>;
  findFamiliesByQuery(query: string): Promise<FamilySnapshot[]>;
  resolveMembership(personId: string, asOf: string): Promise<MembershipSnapshot | null>;
  listActiveMemberships(familyId: string, asOf: string): Promise<MembershipSnapshot[]>;
}
