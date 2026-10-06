import type { Item } from "../entities/item.entity.js";

export interface ItemQueryFilters {
  categoryId?: string;
  onlyActive?: boolean;
}

export interface ItemRepository {
  save(item: Item): Promise<void>;
  findById(id: string): Promise<Item | null>;
  findByCategoryAndName(categoryId: string, name: string): Promise<Item | null>;
  findByQuery(query: string, filters?: ItemQueryFilters): Promise<Item[]>;
}
