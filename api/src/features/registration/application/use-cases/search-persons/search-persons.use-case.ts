import type { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { FamilyRepository } from "../../../domain/repositories/family.repository.js";
import type { MembershipRepository } from "../../../domain/repositories/membership.repository.js";
import { normalizePagination } from "../../../domain/repositories/pagination.js";
import type { PersonRepository } from "../../../domain/repositories/person.repository.js";
import type { SearchPersonsInput } from "./search-persons.input.js";
import type { PersonListItem, SearchPersonsOutput } from "./search-persons.output.js";

export class SearchPersonsUseCase {
  constructor(
    private readonly persons: PersonRepository,
    private readonly memberships: MembershipRepository,
    private readonly families: FamilyRepository,
  ) {}

  async execute(input: SearchPersonsInput): Promise<SearchPersonsOutput> {
    const pagination = normalizePagination(input.page, input.pageSize);
    const rawQuery = input.cpf !== undefined && input.cpf.trim() !== "" ? input.cpf : (input.q ?? "");
    const trimmed = rawQuery.trim();
    // CPF may arrive masked ("123.456.789-09"); the index stores only digits.
    const query = /^\d[\d.\-/\s]*$/.test(trimmed) && /\d/.test(trimmed) ? trimmed.replace(/\D/g, "") || trimmed : trimmed;
    const timeZone = process.env.APP_TIMEZONE ?? "America/Fortaleza";
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()) as CivilDate;
    if (input.familyId !== undefined && input.familyId !== "") {
      const activeMemberships = await this.memberships.findActiveByFamily(input.familyId, today);
      const personIdSet = new Set(activeMemberships.map((m) => m.personId));
      if (personIdSet.size === 0) {
        return { items: [], page: pagination.page, pageSize: pagination.pageSize, total: 0 };
      }
      const allMatched = await this.persons.findByQuery(query, { page: 1, pageSize: 10000 });
      const filtered = allMatched.items.filter((p) => personIdSet.has(p.id));
      const total = filtered.length;
      const start = (pagination.page - 1) * pagination.pageSize;
      const paged = filtered.slice(start, start + pagination.pageSize);
      const items: PersonListItem[] = [];
      for (const person of paged) {
        const active = await this.memberships.findActiveByPerson(person.id, today);
        let currentFamilyCode: string | null = null;
        if (active !== null) {
          const family = await this.families.findById(active.familyId);
          currentFamilyCode = family?.code ?? null;
        }
        items.push({
          personId: person.id,
          name: person.name,
          birthDate: person.birthDate,
          currentFamilyId: active?.familyId ?? null,
          currentFamilyCode,
        });
      }
      return { items, page: pagination.page, pageSize: pagination.pageSize, total };
    }
    const page = await this.persons.findByQuery(query, pagination);
    const items: PersonListItem[] = [];
    for (const person of page.items) {
      const active = await this.memberships.findActiveByPerson(person.id, today);
      let currentFamilyCode: string | null = null;
      if (active !== null) {
        const family = await this.families.findById(active.familyId);
        currentFamilyCode = family?.code ?? null;
      }
      items.push({
        personId: person.id,
        name: person.name,
        birthDate: person.birthDate,
        currentFamilyId: active?.familyId ?? null,
        currentFamilyCode,
      });
    }
    return { items, page: page.page, pageSize: page.pageSize, total: page.total };
  }
}
