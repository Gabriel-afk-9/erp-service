import { Family } from "../../../domain/entities/family.entity.js";
import type { FamilyCodeGenerator } from "../../../domain/gateways/family-code-generator.gateway.js";
import type { RegistrationUnitOfWork } from "../../../domain/repositories/registration-unit-of-work.js";
import type { CreateFamilyInput } from "./create-family.input.js";
import type { CreateFamilyOutput } from "./create-family.output.js";

export class CreateFamilyUseCase {
  constructor(
    private readonly uow: RegistrationUnitOfWork,
    private readonly codeGenerator: FamilyCodeGenerator,
  ) {}

  async execute(input: CreateFamilyInput): Promise<CreateFamilyOutput> {
    const code = await this.codeGenerator.next();
    const family = Family.create({
      code,
      referenceName: input.referenceName ?? null,
      address: input.address ?? null,
      neighborhood: input.neighborhood ?? null,
      postalCode: input.postalCode ?? null,
      locationType: input.locationType,
      contactPhone: input.contactPhone ?? null,
    });
    await this.uow.transactional(async (stores) => {
      await stores.families.save(family);
      await stores.audits.recordAudit({
        entityType: "Family",
        entityId: family.id,
        action: "CREATED",
        actorId: input.actorId,
        occurredAt: new Date().toISOString(),
        before: null,
        after: { code: family.code, revision: family.revision },
        reason: null,
      });
    });
    return { familyId: family.id, code: family.code, revision: family.revision };
  }
}
