import type { Category } from "../entities/category.entity.js";

export interface CategoryRepository {
  save(category: Category): Promise<void>;
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  findByQuery(query: string, onlyActive?: boolean): Promise<Category[]>;
}
