import { ConcurrentModificationError } from "../../../../../shared/domain/errors/concurrent-modification.error.js";
import { ItemNameAlreadyExistsInCategoryError } from "../../../domain/errors/item-name-already-exists-in-category.error.js";
import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import type { CategoryRepository } from "../../../domain/repositories/category.repository.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { UpdateItemInput } from "./update-item.input.js";
import type { UpdateItemOutput } from "./update-item.output.js";

export class UpdateItemUseCase {
  constructor(
    private readonly items: ItemRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(input: UpdateItemInput): Promise<UpdateItemOutput> {
    const item = await this.items.findById(input.itemId);
    if (item === null) {
      throw new ItemNotFoundError(input.itemId);
    }
    if (item.revision !== input.expectedRevision) {
      throw new ConcurrentModificationError(input.expectedRevision, item.revision);
    }
    if (input.name !== undefined && input.name.trim() !== item.name) {
      const existing = await this.items.findByCategoryAndName(item.categoryId, input.name.trim());
      if (existing !== null && existing.id !== item.id) {
        throw new ItemNameAlreadyExistsInCategoryError(input.name.trim());
      }
    }
    item.update({ name: input.name, description: input.description, requiresExpiration: input.requiresExpiration });
    await this.items.save(item);
    return { itemId: item.id, revision: item.revision };
  }
}

