import type { FamilySnapshot } from "../../../domain/gateways/registry.gateway.js";

// Synthetic data only. No real persons, addresses or documents.

export const familiesFixture: FamilySnapshot[] = [
  {
    familyId: "fam-001",
    familyNumber: "001",
    address: {
      street: "Rua Ficticia 1",
      neighborhood: "Bairro Exemplo",
      zipCode: "60000-001",
      locationType: "URBAN",
    },
    phone: null,
    revision: 1,
  },
  {
    familyId: "fam-002",
    familyNumber: "002",
    address: {
      street: "Rua Ficticia 2",
      neighborhood: "Bairro Exemplo",
      zipCode: "60000-002",
      locationType: "URBAN",
    },
    phone: null,
    revision: 1,
  },
  {
    familyId: "fam-003",
    familyNumber: "003",
    address: {
      street: "Rua Ficticia 3",
      neighborhood: "Bairro Exemplo",
      zipCode: "60000-003",
      locationType: "RURAL",
    },
    phone: null,
    revision: 1,
  },
  {
    familyId: "fam-004",
    familyNumber: "004",
    address: {
      street: "Rua Ficticia 4",
      neighborhood: "Bairro Exemplo",
      zipCode: "60000-004",
      locationType: "URBAN",
    },
    phone: null,
    revision: 1,
  },
  {
    familyId: "fam-005",
    familyNumber: "005",
    address: {
      street: "Rua Ficticia 5",
      neighborhood: "Bairro Exemplo",
      zipCode: "60000-005",
      locationType: "URBAN",
    },
    phone: null,
    revision: 1,
  },
];
