import type { PrismaClient } from "@prisma/client";
import { FamilyCode } from "../../domain/value-objects/family-code.value-object.js";
import { FamilyCodeInvalidError } from "../../domain/errors/family-code-invalid.error.js";
import type { FamilyCodeGenerator } from "../../domain/gateways/family-code-generator.gateway.js";

export class PrismaFamilyCodeGenerator implements FamilyCodeGenerator {
  constructor(private readonly prisma: PrismaClient) {}

  async next(): Promise<FamilyCode> {
    const rows = await this.prisma.$queryRaw<Array<{ nextval: bigint }>>`SELECT nextval('family_code_seq')`;
    const formatted = String(rows[0].nextval).padStart(6, "0");
    if (formatted.length !== 6) {
      throw new FamilyCodeInvalidError(formatted);
    }
    return FamilyCode.from(formatted);
  }
}
