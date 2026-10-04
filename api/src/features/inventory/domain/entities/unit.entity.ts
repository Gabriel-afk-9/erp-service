import { Id } from "../../../../shared/domain/value-objects/id.value-object.js";
import type { DecimalPlaces } from "../value-objects/decimal-places.value-object.js";
import type { QuantityIncrement } from "../value-objects/quantity-increment.value-object.js";

export interface UnitProps {
  id: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  quantityIncrement: number;
  isActive: boolean;
  revision: number;
}

export interface NewUnitProps {
  symbol: string;
  name: string;
  decimalPlaces: DecimalPlaces;
  quantityIncrement: QuantityIncrement;
}

export function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

export class Unit {
  private constructor(private props: UnitProps) {}

  static create(input: NewUnitProps): Unit {
    const symbol = normalizeSymbol(input.symbol);
    const name = input.name.trim();
    return new Unit({
      id: Id.generate(),
      symbol: symbol.slice(0, 20),
      name: name.slice(0, 100),
      decimalPlaces: input.decimalPlaces as number,
      quantityIncrement: input.quantityIncrement as number,
      isActive: true,
      revision: 1,
    });
  }

  static rehydrate(props: UnitProps): Unit {
    return new Unit(props);
  }

  get id(): string {
    return this.props.id;
  }

  get symbol(): string {
    return this.props.symbol;
  }

  get name(): string {
    return this.props.name;
  }

  get decimalPlaces(): number {
    return this.props.decimalPlaces;
  }

  get quantityIncrement(): number {
    return this.props.quantityIncrement;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get revision(): number {
    return this.props.revision;
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.revision += 1;
  }
}
