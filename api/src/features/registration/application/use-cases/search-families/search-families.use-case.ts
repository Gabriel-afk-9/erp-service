import type { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import type { FamilyRepository } from "../../../domain/repositories/family.repository.js";
import type { MembershipRepository } from "../../../domain/repositories/membership.repository.js";
import { normalizePagination } from "../../../domain/repositories/pagination.js";
import type { SearchFamiliesInput } from "./search-families.input.js";
import type { FamilyListItem, SearchFamiliesOutput } from "./search-families.output.js";

export class SearchFamiliesUseCase {
  constructor(
    private readonly families: FamilyRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(input: SearchFamiliesInput): Promise<SearchFamiliesOutput> {
    const pagination = normalizePagination(input.page, input.pageSize);
    const query = input.code !== undefined && input.code !== "" ? input.code : (input.q ?? "");
    const page = await this.families.findByQuery(query, pagination);
    const today = new Date().toISOString().slice(0, 10) as CivilDate;
    const items: FamilyListItem[] = [];
    for (const family of page.items) {
      const active = await this.memberships.findActiveByFamily(family.id, today);
      items.push({
        familyId: family.id,
        code: family.code,
        referenceName: family.referenceName,
        neighborhood: family.neighborhood,
        memberCount: new Set(active.map((m) => m.personId)).size,
      });
    }
    return { items, page: page.page, pageSize: page.pageSize, total: page.total };
  }
}
