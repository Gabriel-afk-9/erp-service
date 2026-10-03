import { Family } from "../../domain/entities/family.entity.js";
import { Person } from "../../domain/entities/person.entity.js";
import { FamilyMembership } from "../../domain/entities/family-membership.entity.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { PersonRepository } from "../../domain/repositories/person.repository.js";
import type { MembershipRepository } from "../../domain/repositories/membership.repository.js";
import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { Page, Pagination } from "../../domain/repositories/pagination.js";

export function stubFamily(overrides: Partial<{
  id: string;
  code: string;
  referenceName: string | null;
  address: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  locationType: "URBAN" | "RURAL";
  contactPhone: string | null;
}> = {}): Family {
  return Family.restore({
    id: overrides.id ?? "11111111-1111-1111-1111-111111111111",
    code: overrides.code ?? "FAM-001",
    referenceName: overrides.referenceName ?? "Maria Silva",
    address: overrides.address ?? "Rua das Flores, 123",
    neighborhood: overrides.neighborhood ?? "Centro",
    postalCode: overrides.postalCode ?? "12345-678",
    locationType: overrides.locationType ?? "URBAN",
    contactPhone: overrides.contactPhone ?? "(11) 99999-9999",
    revision: 1,
  });
}

export function stubPerson(overrides: Partial<{
  id: string;
  name: string;
  birthDate: CivilDate | null;
  sex: "MALE" | "FEMALE" | "OTHER" | null;
  cpf: string | null;
  rg: string | null;
  occupation: string | null;
  educationLevel: string | null;
  contactPhone: string | null;
}> = {}): Person {
  return Person.restore({
    id: overrides.id ?? "22222222-2222-2222-2222-222222222222",
    name: overrides.name ?? "João Silva",
    birthDate: overrides.birthDate ?? ("1990-01-15" as CivilDate),
    sex: overrides.sex ?? "MALE",
    cpf: overrides.cpf ?? "12345678901",
    rg: overrides.rg ?? "12345678",
    occupation: overrides.occupation ?? "Operador",
    educationLevel: overrides.educationLevel ?? "Ensino Médio",
    contactPhone: overrides.contactPhone ?? "(11) 98888-8888",
    revision: 1,
  });
}

export function stubMembership(overrides: Partial<{
  id: string;
  personId: string;
  familyId: string;
  relationshipToReference: string | null;
  isReference: boolean;
  validFrom: CivilDate;
  validUntil: CivilDate | null;
}> = {}): FamilyMembership {
  const familyId = overrides.familyId ?? "11111111-1111-1111-1111-111111111111";
  const personId = overrides.personId ?? "22222222-2222-2222-2222-222222222222";
  return FamilyMembership.restore({
    id: overrides.id ?? "33333333-3333-3333-3333-333333333333",
    personId,
    familyId,
    relationshipToReference: overrides.relationshipToReference ?? "Cônjuge",
    isReference: overrides.isReference ?? false,
    validFrom: overrides.validFrom ?? ("2024-01-01" as CivilDate),
    validUntil: overrides.validUntil ?? null,
    revision: 1,
  });
}

export class FakeFamilyRepository implements FamilyRepository {
  private families = new Map<string, Family>();

  async save(family: Family): Promise<void> {
    this.families.set(family.id, family);
  }

  async findById(id: string): Promise<Family | null> {
    return this.families.get(id) ?? null;
  }

  async findByCode(code: string): Promise<Family | null> {
    for (const family of this.families.values()) {
      if (family.code === code) return family;
    }
    return null;
  }

  async findByQuery(query: string, pagination: Pagination): Promise<Page<Family>> {
    const normalized = query.trim().toLowerCase();
    const items = Array.from(this.families.values()).filter((f) =>
      normalized === "" ||
      f.code.toLowerCase().includes(normalized) ||
      f.address?.toLowerCase().includes(normalized) ||
      f.neighborhood?.toLowerCase().includes(normalized)
    );
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return {
      items: items.slice(start, end),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: items.length,
    };
  }

  clear(): void {
    this.families.clear();
  }
}

export class FakePersonRepository implements PersonRepository {
  private persons = new Map<string, Person>();

  async save(person: Person): Promise<void> {
    this.persons.set(person.id, person);
  }

  async findById(id: string): Promise<Person | null> {
    return this.persons.get(id) ?? null;
  }

  async findByCpf(cpf: string): Promise<Person | null> {
    for (const person of this.persons.values()) {
      if (person.cpf === cpf) return person;
    }
    return null;
  }

  async findByQuery(query: string, pagination: Pagination): Promise<Page<Person>> {
    const normalized = query.trim().toLowerCase();
    const items = Array.from(this.persons.values()).filter((p) =>
      normalized === "" ||
      p.name.toLowerCase().includes(normalized) ||
      p.cpf?.toLowerCase().includes(normalized)
    );
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return {
      items: items.slice(start, end),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: items.length,
    };
  }

  clear(): void {
    this.persons.clear();
  }
}

export class FakeMembershipRepository implements MembershipRepository {
  private memberships = new Map<string, FamilyMembership>();

  async save(membership: FamilyMembership): Promise<void> {
    this.memberships.set(membership.id, membership);
  }

  async findById(id: string): Promise<FamilyMembership | null> {
    return this.memberships.get(id) ?? null;
  }

  async findActiveByPerson(personId: string, asOf: CivilDate): Promise<FamilyMembership | null> {
    for (const m of this.memberships.values()) {
      if (m.personId === personId && m.isActiveOn(asOf)) return m;
    }
    return null;
  }

  async findActiveByFamily(familyId: string, asOf: CivilDate): Promise<FamilyMembership[]> {
    const result: FamilyMembership[] = [];
    for (const m of this.memberships.values()) {
      if (m.familyId === familyId && m.isActiveOn(asOf)) result.push(m);
    }
    return result;
  }

  async findAllByFamily(familyId: string): Promise<FamilyMembership[]> {
    const result: FamilyMembership[] = [];
    for (const m of this.memberships.values()) {
      if (m.familyId === familyId) result.push(m);
    }
    return result;
  }

  async findOverlapping(personId: string, from: CivilDate, to: CivilDate | null): Promise<FamilyMembership[]> {
    const result: FamilyMembership[] = [];
    for (const m of this.memberships.values()) {
      if (m.personId === personId && m.overlaps(from, to)) result.push(m);
    }
    return result;
  }

  clear(): void {
    this.memberships.clear();
  }
}

export class FakeRegistrationAuditRecorder {
  private audits: Record<string, unknown>[] = [];

  async recordAudit(input: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: string;
    occurredAt: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    reason: string | null;
  }): Promise<void> {
    this.audits.push(input);
  }

  getAudits(): Record<string, unknown>[] {
    return this.audits;
  }

  clear(): void {
    this.audits = [];
  }
}

export class FakeRegistrationUnitOfWork {
  families: FakeFamilyRepository;
  persons: FakePersonRepository;
  memberships: FakeMembershipRepository;
  audits: FakeRegistrationAuditRecorder;

  constructor() {
    this.families = new FakeFamilyRepository();
    this.persons = new FakePersonRepository();
    this.memberships = new FakeMembershipRepository();
    this.audits = new FakeRegistrationAuditRecorder();
  }

  async transactional<T>(work: (stores: {
    families: FakeFamilyRepository;
    persons: FakePersonRepository;
    memberships: FakeMembershipRepository;
    audits: FakeRegistrationAuditRecorder;
  }) => Promise<T>): Promise<T> {
    return work(this);
  }
}