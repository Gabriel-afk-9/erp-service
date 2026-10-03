import type {
  FamilySnapshot,
  MembershipSnapshot,
  RegistryGateway,
} from "../../domain/gateways/registry.gateway.js";
import type { PersonFixture } from "./fixtures/people.fixture.js";

function isActiveOn(startDate: string, endDate: string | null, asOf: string): boolean {
  if (startDate > asOf) return false;
  if (endDate === null) return true;
  return endDate > asOf;
}

export class InMemoryRegistryGateway implements RegistryGateway {
  constructor(
    private readonly families: FamilySnapshot[],
    private readonly people: PersonFixture[],
  ) {}

  async findFamily(familyId: string): Promise<FamilySnapshot | null> {
    return this.families.find((f) => f.familyId === familyId) ?? null;
  }

  async findFamiliesByQuery(query: string): Promise<FamilySnapshot[]> {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) return [];
    return this.families.filter((f) =>
      f.familyNumber.toLowerCase().includes(normalized) ||
      f.address.street.toLowerCase().includes(normalized) ||
      f.address.neighborhood.toLowerCase().includes(normalized),
    );
  }

  async resolveMembership(personId: string, asOf: string): Promise<MembershipSnapshot | null> {
    const person = this.people.find((p) => p.personId === personId);
    if (!person) return null;
    return person.memberships.find((m) => isActiveOn(m.startDate, m.endDate, asOf)) ?? null;
  }

  async listActiveMemberships(familyId: string, asOf: string): Promise<MembershipSnapshot[]> {
    const result: MembershipSnapshot[] = [];
    for (const person of this.people) {
      for (const m of person.memberships) {
        if (m.familyId === familyId && isActiveOn(m.startDate, m.endDate, asOf)) {
          result.push(m);
        }
      }
    }
    return result;
  }
}
