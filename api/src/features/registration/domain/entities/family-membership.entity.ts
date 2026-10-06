import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { InvalidDateRangeError } from "../errors/invalid-date-range.error.js";
import { TextTooLongError } from "../errors/text-too-long.error.js";

export interface MembershipProps {
  id: string;
  personId: string;
  familyId: string;
  relationshipToReference: string | null;
  isReference: boolean;
  validFrom: CivilDate;
  validUntil: CivilDate | null;
  revision: number;
}

export interface NewMembershipProps {
  personId: string;
  familyId: string;
  relationshipToReference?: string | null;
  isReference: boolean;
  validFrom: CivilDate;
}

const MAX_RELATIONSHIP = 100;

export class FamilyMembership {
  private constructor(private props: MembershipProps) {}

  static create(input: NewMembershipProps, today: CivilDate): FamilyMembership {
    if (input.validFrom > today) {
      throw new InvalidDateRangeError("membership start cannot be in the future");
    }
    let relationship: string | null = null;
    if (
      input.relationshipToReference !== null &&
      input.relationshipToReference !== undefined &&
      input.relationshipToReference.trim() !== ""
    ) {
      const trimmed = input.relationshipToReference.trim();
      if (trimmed.length > MAX_RELATIONSHIP) {
        throw new TextTooLongError("relationshipToReference", MAX_RELATIONSHIP);
      }
      relationship = trimmed;
    }
    return new FamilyMembership({
      id: Id.generate(),
      personId: input.personId,
      familyId: input.familyId,
      relationshipToReference: relationship,
      isReference: input.isReference,
      validFrom: input.validFrom,
      validUntil: null,
      revision: 1,
    });
  }

  static restore(props: MembershipProps): FamilyMembership {
    return new FamilyMembership({ ...props });
  }

  end(validUntil: CivilDate): void {
    if (validUntil < this.props.validFrom) {
      throw new InvalidDateRangeError("membership end cannot be before its start");
    }
    this.props.validUntil = validUntil;
    this.props.revision += 1;
  }

  isActiveOn(asOf: CivilDate): boolean {
    if (this.props.validFrom > asOf) return false;
    if (this.props.validUntil === null) return true;
    return this.props.validUntil > asOf;
  }

  overlaps(from: CivilDate, to: CivilDate | null): boolean {
    if (to !== null && this.props.validFrom >= to) return false;
    if (this.props.validUntil !== null && this.props.validUntil <= from) return false;
    return true;
  }

  get id(): string {
    return this.props.id;
  }

  get personId(): string {
    return this.props.personId;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get relationshipToReference(): string | null {
    return this.props.relationshipToReference;
  }

  get isReference(): boolean {
    return this.props.isReference;
  }

  get validFrom(): CivilDate {
    return this.props.validFrom;
  }

  get validUntil(): CivilDate | null {
    return this.props.validUntil;
  }

  get revision(): number {
    return this.props.revision;
  }
}
