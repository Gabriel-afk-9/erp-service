import { normalizeSymbol, Unit } from "../../../domain/entities/unit.entity.js";
import { UnitSymbolAlreadyExistsError } from "../../../domain/errors/unit-symbol-already-exists.error.js";
import type { UnitRepository } from "../../../domain/repositories/unit.repository.js";
import { DecimalPlaces } from "../../../domain/value-objects/decimal-places.value-object.js";
import { QuantityIncrement } from "../../../domain/value-objects/quantity-increment.value-object.js";
import type { CreateUnitInput } from "./create-unit.input.js";
import type { CreateUnitOutput } from "./create-unit.output.js";

export class CreateUnitUseCase {
  constructor(private readonly repository: UnitRepository) {}

  async execute(input: CreateUnitInput): Promise<CreateUnitOutput> {
    const symbol = normalizeSymbol(input.symbol);
    const existing = await this.repository.findBySymbol(symbol);
    if (existing !== null) {
      throw new UnitSymbolAlreadyExistsError(symbol);
    }
    const unit = Unit.create({
      symbol,
      name: input.name,
      decimalPlaces: DecimalPlaces.of(input.decimalPlaces),
      quantityIncrement: QuantityIncrement.of(input.quantityIncrement),
    });
    await this.repository.save(unit);
    return { unitId: unit.id, symbol: unit.symbol };
  }
}

