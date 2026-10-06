import { CivilDate } from "../../../../../shared/domain/value-objects/civil-date.value-object.js";
import { FamilyNotFoundError } from "../../../domain/errors/family-not-found.error.js";
import type { FamilyRepository } from "../../../domain/repositories/family.repository.js";
import type { MembershipRepository } from "../../../domain/repositories/membership.repository.js";
import type { PersonRepository } from "../../../domain/repositories/person.repository.js";
import type { GetFamilyInput } from "./get-family.input.js";
import type { FamilyMemberItem, GetFamilyOutput } from "./get-family.output.js";

export class GetFamilyUseCase {
  constructor(
    private readonly families: FamilyRepository,
    private readonly memberships: MembershipRepository,
    private readonly persons: PersonRepository,
  ) {}

  async execute(input: GetFamilyInput): Promise<GetFamilyOutput> {
    const family = await this.families.findById(input.familyId);
    if (family === null) {
      throw new FamilyNotFoundError(input.familyId);
    }
    const timeZone = process.env.APP_TIMEZONE ?? "America/Fortaleza";
    const todayDefault = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()) as CivilDate;
    const asOf =
      input.asOf === undefined || input.asOf === ""
        ? todayDefault
        : CivilDate.from(input.asOf);
    const all = await this.memberships.findAllByFamily(input.familyId);
    const members: FamilyMemberItem[] = [];
    for (const membership of all) {
      const person = await this.persons.findById(membership.personId);
      members.push({
        membershipId: membership.id,
        personId: membership.personId,
        personName: person?.name ?? "",
        relationshipToReference: membership.relationshipToReference,
        isReference: membership.isReference,
        validFrom: membership.validFrom,
        validUntil: membership.validUntil,
        isActive: membership.isActiveOn(asOf),
        revision: membership.revision,
      });
    }
    const memberCount = new Set(members.filter((m) => m.isActive).map((m) => m.personId)).size;
    return {
      familyId: family.id,
      code: family.code,
      referenceName: family.referenceName,
      address: family.address,
      neighborhood: family.neighborhood,
      postalCode: family.postalCode,
      locationType: family.locationType,
      contactPhone: family.contactPhone,
      revision: family.revision,
      memberCount,
      members,
    };
  }
}
