import { ConcurrentModificationError } from "../../../../../shared/domain/errors/concurrent-modification.error.js";
import { ItemNotFoundError } from "../../../domain/errors/item-not-found.error.js";
import type { ItemRepository } from "../../../domain/repositories/item.repository.js";
import type { DeactivateItemInput } from "./deactivate-item.input.js";
import type { DeactivateItemOutput } from "./deactivate-item.output.js";

export class DeactivateItemUseCase {
  constructor(private readonly repository: ItemRepository) {}

  async execute(input: DeactivateItemInput): Promise<DeactivateItemOutput> {
    const item = await this.repository.findById(input.itemId);
    if (item === null) {
      throw new ItemNotFoundError(input.itemId);
    }
    if (item.revision !== input.expectedRevision) {
      throw new ConcurrentModificationError(input.expectedRevision, item.revision);
    }
    item.deactivate();
    await this.repository.save(item);
    return { itemId: item.id, isActive: false };
  }
}

