import type { FamilyCode } from "../value-objects/family-code.value-object.js";

export interface FamilyCodeGenerator {
  next(): Promise<FamilyCode>;
}
