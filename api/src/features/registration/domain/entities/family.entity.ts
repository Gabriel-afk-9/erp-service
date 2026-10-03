import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { PostalCode } from "../value-objects/postal-code.value-object.js";

export type LocationType = "URBAN" | "RURAL";

export interface FamilyProps {
  id: string;
  code: string;
  referenceName: string | null;
  address: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  locationType: LocationType;
  contactPhone: string | null;
  revision: number;
}

export interface NewFamilyProps {
  code: string;
  referenceName?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  locationType: LocationType;
  contactPhone?: string | null;
}

export interface FamilyDetailsCorrection {
  referenceName?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  locationType?: LocationType;
  contactPhone?: string | null;
}

const MAX_SHORT_TEXT = 500;
const MAX_PHONE = 50;

function normalizeText(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return trimmed.slice(0, max);
}

export class Family {
  private constructor(private props: FamilyProps) {}

  static create(input: NewFamilyProps): Family {
    return new Family({
      id: Id.generate(),
      code: input.code,
      referenceName: normalizeText(input.referenceName, MAX_SHORT_TEXT),
      address: normalizeText(input.address, MAX_SHORT_TEXT),
      neighborhood: normalizeText(input.neighborhood, MAX_SHORT_TEXT),
      postalCode: PostalCode.from(input.postalCode ?? null),
      locationType: input.locationType,
      contactPhone: normalizeText(input.contactPhone, MAX_PHONE),
      revision: 1,
    });
  }

  static restore(props: FamilyProps): Family {
    return new Family({ ...props });
  }

  correctDetails(fields: FamilyDetailsCorrection): void {
    if (fields.referenceName !== undefined) {
      this.props.referenceName = normalizeText(fields.referenceName, MAX_SHORT_TEXT);
    }
    if (fields.address !== undefined) {
      this.props.address = normalizeText(fields.address, MAX_SHORT_TEXT);
    }
    if (fields.neighborhood !== undefined) {
      this.props.neighborhood = normalizeText(fields.neighborhood, MAX_SHORT_TEXT);
    }
    if (fields.postalCode !== undefined) {
      this.props.postalCode = PostalCode.from(fields.postalCode);
    }
    if (fields.locationType !== undefined) {
      this.props.locationType = fields.locationType;
    }
    if (fields.contactPhone !== undefined) {
      this.props.contactPhone = normalizeText(fields.contactPhone, MAX_PHONE);
    }
    this.props.revision += 1;
  }

  bumpRevision(): void {
    this.props.revision += 1;
  }

  get id(): string {
    return this.props.id;
  }

  get code(): string {
    return this.props.code;
  }

  get referenceName(): string | null {
    return this.props.referenceName;
  }

  get address(): string | null {
    return this.props.address;
  }

  get neighborhood(): string | null {
    return this.props.neighborhood;
  }

  get postalCode(): string | null {
    return this.props.postalCode;
  }

  get locationType(): LocationType {
    return this.props.locationType;
  }

  get contactPhone(): string | null {
    return this.props.contactPhone;
  }

  get revision(): number {
    return this.props.revision;
  }
}
