import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class UnitSymbolAlreadyExistsError extends DomainError {
  readonly code = "UNIT_SYMBOL_ALREADY_EXISTS";

  constructor(symbol: string) {
    super(`Unit symbol already exists: ${symbol}`);
  }
}
