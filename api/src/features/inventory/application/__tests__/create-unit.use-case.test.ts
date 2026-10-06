import { describe, expect, it } from "vitest";
import { Unit } from "../../domain/entities/unit.entity.js";
import { UnitSymbolAlreadyExistsError } from "../../domain/errors/unit-symbol-already-exists.error.js";
import { DecimalPlacesInvalidError } from "../../domain/errors/decimal-places-invalid.error.js";
import type { UnitRepository } from "../../domain/repositories/unit.repository.js";
import { CreateUnitUseCase } from "../use-cases/create-unit/create-unit.use-case.js";

class InMemoryUnits implements UnitRepository {
  readonly store = new Map<string, Unit>();

  async save(unit: Unit): Promise<void> {
    this.store.set(unit.id, unit);
  }

  async findById(id: string): Promise<Unit | null> {
    return this.store.get(id) ?? null;
  }

  async findBySymbol(symbol: string): Promise<Unit | null> {
    for (const unit of this.store.values()) {
      if (unit.symbol === symbol.trim().toUpperCase()) return unit;
    }
    return null;
  }

  async listAll(): Promise<Unit[]> {
    return [...this.store.values()];
  }
}

describe("CreateUnitUseCase", () => {
  it("creates unit with normalized uppercase symbol", async () => {
    const repository = new InMemoryUnits();
    const useCase = new CreateUnitUseCase(repository);
    const output = await useCase.execute({ symbol: "kg", name: "Quilograma", decimalPlaces: 3, quantityIncrement: 0.1 });
    expect(output.symbol).toBe("KG");
  });

  it("duplicate symbol throws UnitSymbolAlreadyExistsError", async () => {
    const repository = new InMemoryUnits();
    const useCase = new CreateUnitUseCase(repository);
    await useCase.execute({ symbol: "KG", name: "Quilograma", decimalPlaces: 3, quantityIncrement: 0.1 });
    await expect(
      useCase.execute({ symbol: "kg", name: "Outro", decimalPlaces: 0, quantityIncrement: 1 }),
    ).rejects.toThrow(UnitSymbolAlreadyExistsError);
  });

  it("invalid decimalPlaces throws DecimalPlacesInvalidError", async () => {
    const repository = new InMemoryUnits();
    const useCase = new CreateUnitUseCase(repository);
    await expect(
      useCase.execute({ symbol: "XX", name: "Teste", decimalPlaces: 5, quantityIncrement: 1 }),
    ).rejects.toThrow(DecimalPlacesInvalidError);
  });
});
