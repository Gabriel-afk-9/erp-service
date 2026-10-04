import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import { CategoryInactiveError } from "../errors/category-inactive.error.js";

export interface CategoryProps {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  revision: number;
}

export interface NewCategoryProps {
  name: string;
  description?: string | null;
}

function normalizeName(value: string): string {
  // Length is enforced by Zod at the presentation layer (min 2); the entity
  // normalizes defensively without inventing a new error code.
  return value.trim().slice(0, 100);
}

export class Category {
  private constructor(private props: CategoryProps) {}

  static create(input: NewCategoryProps): Category {
    return new Category({
      id: Id.generate(),
      name: normalizeName(input.name),
      description: input.description?.trim()?.slice(0, 500) || null,
      isActive: true,
      revision: 1,
    });
  }

  static rehydrate(props: CategoryProps): Category {
    return new Category(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get revision(): number {
    return this.props.revision;
  }

  update(fields: { name?: string; description?: string | null }): void {
    if (fields.name !== undefined) {
      this.props.name = normalizeName(fields.name);
    }
    if (fields.description !== undefined) {
      const trimmed = fields.description?.trim() ?? "";
      this.props.description = trimmed === "" ? null : trimmed.slice(0, 500);
    }
    this.props.revision += 1;
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new CategoryInactiveError(this.props.id);
    }
    this.props.isActive = false;
    this.props.revision += 1;
  }
}
