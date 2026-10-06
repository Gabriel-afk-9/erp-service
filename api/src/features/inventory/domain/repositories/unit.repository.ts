import type { Unit } from "../entities/unit.entity.js";

export interface UnitRepository {
  save(unit: Unit): Promise<void>;
  findById(id: string): Promise<Unit | null>;
  findBySymbol(symbol: string): Promise<Unit | null>;
  listAll(onlyActive?: boolean): Promise<Unit[]>;
}
