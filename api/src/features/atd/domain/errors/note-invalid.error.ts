import { DomainError } from "../../../../shared/domain/errors/domain.error.js";

export class NoteInvalidError extends DomainError {
  readonly code = "NOTE_INVALID";

  constructor() {
    super("Note must be null or a non-empty text up to 500 characters");
  }
}
