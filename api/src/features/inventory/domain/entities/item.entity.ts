import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { ItemInactiveError } from "../errors/item-inactive.error.js";

export interface ItemProps {
  id: string;
  categoryId: string;
  unitId: string;
  name: string;
  description: string | null;
  requiresExpiration: boolean;
  isActive: boolean;
  revision: number;
}

export interface NewItemProps {
  categoryId: string;
  unitId: string;
  name: string;
  description?: string | null;
  requiresExpiration: boolean;
}

function normalizeItemName(value: string): string {
  // Length is enforced by Zod at the presentation layer (min 2); the entity
  // normalizes defensively without inventing a new error code.
  return value.trim().slice(0, 200);
}

export class Item {
  private constructor(private props: ItemProps) {}

  static create(input: NewItemProps): Item {
    return new Item({
      id: Id.generate(),
      categoryId: input.categoryId,
      unitId: input.unitId,
      name: normalizeItemName(input.name),
      description: input.description?.trim()?.slice(0, 500) || null,
      requiresExpiration: input.requiresExpiration,
      isActive: true,
      revision: 1,
    });
  }

  static rehydrate(props: ItemProps): Item {
    return new Item(props);
  }

  get id(): string {
    return this.props.id;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get unitId(): string {
    return this.props.unitId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get requiresExpiration(): boolean {
    return this.props.requiresExpiration;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get revision(): number {
    return this.props.revision;
  }

  update(fields: { name?: string; description?: string | null; requiresExpiration?: boolean }): void {
    if (fields.name !== undefined) {
      this.props.name = normalizeItemName(fields.name);
    }
    if (fields.description !== undefined) {
      const trimmed = fields.description?.trim() ?? "";
      this.props.description = trimmed === "" ? null : trimmed.slice(0, 500);
    }
    if (fields.requiresExpiration !== undefined) {
      this.props.requiresExpiration = fields.requiresExpiration;
    }
    this.props.revision += 1;
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new ItemInactiveError(this.props.id);
    }
    this.props.isActive = false;
    this.props.revision += 1;
  }
}
