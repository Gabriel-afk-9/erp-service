import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import type { ListUnitsInput } from "./list-units.input.js";
import type { ListUnitsOutput } from "./list-units.output.js";

export class ListUnitsUseCase {
  constructor(private readonly repository: UnitRepository) {}

  async execute(input: ListUnitsInput): Promise<ListUnitsOutput> {
    const units = await this.repository.listAll(input.onlyActive);
    return {
      units: units.map((unit) => ({
        unitId: unit.id,
        symbol: unit.symbol,
        name: unit.name,
        decimalPlaces: unit.decimalPlaces,
        quantityIncrement: unit.quantityIncrement,
        isActive: unit.isActive,
      })),
    };
  }
}

