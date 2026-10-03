import type { MembershipSnapshot } from "../../../domain/gateways/registry.gateway.js";

export interface PersonFixture {
  personId: string;
  fullName: string;
  birthDate: string;
  memberships: MembershipSnapshot[];
}

// Synthetic data only. Fictitious names and dates with no real-world correspondence.

export const peopleFixture: PersonFixture[] = [
  {
    personId: "per-001",
    fullName: "Titular Familia 01",
    birthDate: "1980-01-01",
    memberships: [
      {
        membershipId: "mem-001",
        familyId: "fam-001",
        personId: "per-001",
        personName: "Titular Familia 01",
        relationship: "holder",
        isHolder: true,
        startDate: "2024-01-01",
        endDate: null,
        revision: 1,
      },
    ],
  },
  {
    personId: "per-002",
    fullName: "Membro 02 Familia 01",
    birthDate: "2005-05-05",
    memberships: [
      {
        membershipId: "mem-002",
        familyId: "fam-001",
        personId: "per-002",
        personName: "Membro 02 Familia 01",
        relationship: "child",
        isHolder: false,
        startDate: "2024-01-01",
        endDate: null,
        revision: 1,
      },
    ],
  },
  {
    personId: "per-003",
    fullName: "Membro 03 Familia 01",
    birthDate: "2010-10-10",
    memberships: [
      {
        membershipId: "mem-003",
        familyId: "fam-001",
        personId: "per-003",
        personName: "Membro 03 Familia 01",
        relationship: "child",
        isHolder: false,
        startDate: "2024-01-01",
        endDate: null,
        revision: 1,
      },
    ],
  },
  {
    personId: "per-004",
    fullName: "Titular Familia 02",
    birthDate: "1975-02-02",
    memberships: [
      {
        membershipId: "mem-004",
        familyId: "fam-002",
        personId: "per-004",
        personName: "Titular Familia 02",
        relationship: "holder",
        isHolder: true,
        startDate: "2024-01-01",
        endDate: null,
        revision: 1,
      },
    ],
  },
  {
    personId: "per-005",
    fullName: "Conjuge Familia 02",
    birthDate: "1978-03-03",
    memberships: [
      {
        membershipId: "mem-005",
        familyId: "fam-002",
        personId: "per-005",
        personName: "Conjuge Familia 02",
        relationship: "spouse",
        isHolder: false,
        startDate: "2024-01-01",
        endDate: null,
        revision: 1,
      },
    ],
  },
  {
    personId: "per-006",
    fullName: "Titular Familia 03",
    birthDate: "1990-04-04",
    memberships: [
      {
        membershipId: "mem-006",
        familyId: "fam-003",
        personId: "per-006",
        personName: "Titular Familia 03",
        relationship: "holder",
        isHolder: true,
        startDate: "2024-01-01",
        endDate: null,
        revision: 1,
      },
    ],
  },
  {
    personId: "per-007",
    fullName: "Ex Membro Familia 03",
    birthDate: "2000-06-06",
    memberships: [
      {
        membershipId: "mem-007",
        familyId: "fam-003",
        personId: "per-007",
        personName: "Ex Membro Familia 03",
        relationship: "child",
        isHolder: false,
        startDate: "2024-01-01",
        endDate: "2024-06-01",
        revision: 1,
      },
    ],
  },
  {
    personId: "per-008",
    fullName: "Titular Familia 04",
    birthDate: "1985-07-07",
    memberships: [
      {
        membershipId: "mem-008",
        familyId: "fam-004",
        personId: "per-008",
        personName: "Titular Familia 04",
        relationship: "holder",
        isHolder: true,
        startDate: "2024-01-01",
        endDate: null,
        revision: 1,
      },
    ],
  },
  {
    personId: "per-009",
    fullName: "Titular Familia 05",
    birthDate: "1970-08-08",
    memberships: [
      {
        membershipId: "mem-009",
        familyId: "fam-005",
        personId: "per-009",
        personName: "Titular Familia 05",
        relationship: "holder",
        isHolder: true,
        startDate: "2024-01-01",
        endDate: null,
        revision: 1,
      },
    ],
  },
  {
    personId: "per-010",
    fullName: "Membro 10 Familia 05",
    birthDate: "2012-09-09",
    memberships: [
      {
        membershipId: "mem-010",
        familyId: "fam-005",
        personId: "per-010",
        personName: "Membro 10 Familia 05",
        relationship: "child",
        isHolder: false,
        startDate: "2024-01-01",
        endDate: null,
        revision: 1,
      },
    ],
  },
];
