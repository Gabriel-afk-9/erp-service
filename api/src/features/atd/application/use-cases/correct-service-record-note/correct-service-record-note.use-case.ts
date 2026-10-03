import { ConcurrentModificationError } from "../../../domain/errors/concurrent-modification.error.js";
import { ReasonRequiredError } from "../../../domain/errors/reason-required.error.js";
import { ServiceRecordNotFoundError } from "../../../domain/errors/service-record-not-found.error.js";
import type { ServiceRecordRepository } from "../../../domain/repositories/service-record.repository.js";
import type { CorrectServiceRecordNoteInput } from "./correct-service-record-note.input.js";
import type { CorrectServiceRecordNoteOutput } from "./correct-service-record-note.output.js";

export class CorrectServiceRecordNoteUseCase {
  constructor(private readonly repository: ServiceRecordRepository) {}

  async execute(input: CorrectServiceRecordNoteInput): Promise<CorrectServiceRecordNoteOutput> {
    if (input.reason.trim().length < 3) {
      throw new ReasonRequiredError();
    }
    const found = await this.repository.findById(input.serviceRecordId);
    if (found === null) {
      throw new ServiceRecordNotFoundError(input.serviceRecordId);
    }
    const { record } = found;
    if (record.revision !== input.expectedRevision) {
      throw new ConcurrentModificationError(input.expectedRevision, record.revision);
    }
    const before = { note: record.note, revision: record.revision };
    record.correctNote(input.newNote);
    await this.repository.save(record, found.homeVisit, {
      operation: "NOTE_CORRECTED",
      performedBy: input.performedBy,
      before,
      after: { note: record.note, revision: record.revision },
      reason: input.reason.trim(),
    });
    return { serviceRecordId: record.id, note: record.note, revision: record.revision };
  }
}
