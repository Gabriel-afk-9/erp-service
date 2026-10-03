import type { Person } from "../entities/person.entity.js";
import type { Page, Pagination } from "./pagination.js";

export interface PersonRepository {
  save(person: Person): Promise<void>;
  findById(id: string): Promise<Person | null>;
  findByCpf(cpf: string): Promise<Person | null>;
  findByQuery(query: string, pagination: Pagination): Promise<Page<Person>>;
}
