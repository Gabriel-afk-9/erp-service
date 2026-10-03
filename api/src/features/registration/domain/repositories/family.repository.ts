import type { Family } from "../entities/family.entity.js";
import type { Page, Pagination } from "./pagination.js";

export interface FamilyRepository {
  save(family: Family): Promise<void>;
  findById(id: string): Promise<Family | null>;
  findByCode(code: string): Promise<Family | null>;
  findByQuery(query: string, pagination: Pagination): Promise<Page<Family>>;
}
