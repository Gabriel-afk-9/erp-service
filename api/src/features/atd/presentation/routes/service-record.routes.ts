import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ActivityNotFoundError } from "../../../../shared/domain/errors/activity-not-found.error.js";
import { ActivityNotOneOffError } from "../../../../shared/domain/errors/activity-not-one-off.error.js";
import { CivilDateFormatError } from "../../../../shared/domain/errors/civil-date-format.error.js";
import { DomainError } from "../../../../shared/domain/errors/domain.error.js";
import { authorize } from "../../../../shared/presentation/middleware/authorize.middleware.js";
import type { CancelServiceRecordUseCase } from "../../application/use-cases/cancel-service-record/cancel-service-record.use-case.js";
import type { CorrectServiceRecordNoteUseCase } from "../../application/use-cases/correct-service-record-note/correct-service-record-note.use-case.js";
import type { GetServiceRecordUseCase } from "../../application/use-cases/get-service-record/get-service-record.use-case.js";
import type { ListServiceRecordsByFamilyUseCase } from "../../application/use-cases/list-service-records-by-family/list-service-records-by-family.use-case.js";
import type { RegisterServiceRecordUseCase } from "../../application/use-cases/register-service-record/register-service-record.use-case.js";
import { DonationTypeNotAllowedError } from "../../application/use-cases/register-service-record/register-service-record.use-case.js";
import { ConcurrentModificationError } from "../../domain/errors/concurrent-modification.error.js";
import { ExecutorInfoInvalidError } from "../../domain/errors/executor-info-invalid.error.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import { FutureDateError } from "../../domain/errors/future-date.error.js";
import { HomeVisitNotAllowedError } from "../../domain/errors/home-visit-not-allowed.error.js";
import { HomeVisitRequiredError } from "../../domain/errors/home-visit-required.error.js";
import { NoteInvalidError } from "../../domain/errors/note-invalid.error.js";
import { ObservedSituationInvalidError } from "../../domain/errors/observed-situation-invalid.error.js";
import { PersonNotMemberAtDateError } from "../../domain/errors/person-not-member-at-date.error.js";
import { ReasonRequiredError } from "../../domain/errors/reason-required.error.js";
import { ServiceRecordAlreadyCanceledError } from "../../domain/errors/service-record-already-canceled.error.js";
import { ServiceRecordHasDeliveryError } from "../../domain/errors/service-record-has-delivery.error.js";
import { ServiceRecordNotFoundError } from "../../domain/errors/service-record-not-found.error.js";

export interface ServiceRecordRouteDeps {
  register: RegisterServiceRecordUseCase;
  cancel: CancelServiceRecordUseCase;
  correctNote: CorrectServiceRecordNoteUseCase;
  get: GetServiceRecordUseCase;
  listByFamily: ListServiceRecordsByFamilyUseCase;
}

function toStatusCode(error: unknown): number {
  if (error instanceof ServiceRecordNotFoundError) return 404;
  if (error instanceof ServiceRecordAlreadyCanceledError) return 409;
  if (error instanceof ConcurrentModificationError) return 409;
  if (error instanceof CivilDateFormatError) return 400;
  if (
    error instanceof ActivityNotFoundError ||
    error instanceof ActivityNotOneOffError ||
    error instanceof FamilyNotFoundError ||
    error instanceof PersonNotMemberAtDateError ||
    error instanceof FutureDateError ||
    error instanceof HomeVisitRequiredError ||
    error instanceof HomeVisitNotAllowedError ||
    error instanceof NoteInvalidError ||
    error instanceof ObservedSituationInvalidError ||
    error instanceof ReasonRequiredError ||
    error instanceof DonationTypeNotAllowedError ||
    error instanceof ExecutorInfoInvalidError ||
    error instanceof ServiceRecordHasDeliveryError
  ) {
    return 422;
  }
  return 500;
}

const registerBodySchema = z
  .object({
    activityId: z.string().min(1),
    familyId: z.string().min(1),
    personId: z.string().min(1).nullable(),
    occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    executorName: z.string().min(2),
    executorRole: z.string().min(2),
    note: z.string().max(500).nullable(),
    homeVisit: z.object({ observedSituation: z.string().min(1) }).nullable(),
  })
  .strict();

const mutationBodySchema = z
  .object({
    reason: z.string().min(3),
    expectedRevision: z.number().int().positive(),
  })
  .strict();

const noteBodySchema = z
  .object({
    newNote: z.string().max(500).nullable(),
    reason: z.string().min(3),
    expectedRevision: z.number().int().positive(),
  })
  .strict();

const idParamsSchema = z
  .object({ id: z.string().min(1) })
  .strict();

const listQuerySchema = z
  .object({
    familyId: z.string().min(1),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();

export async function registerServiceRecordRoutes(app: FastifyInstance, deps: ServiceRecordRouteDeps): Promise<void> {
  app.post(
    "/service-records",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const parsed = registerBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid service record payload" });
        return;
      }
      try {
        const output = await deps.register.execute({ ...parsed.data, recordedBy: request.operator!.accountId });
        await reply.status(201).send({ data: output });
      } catch (error) {
        const status = toStatusCode(error);
        if (status === 500) throw error;
        await reply.status(status).send({ code: (error as DomainError).code, message: (error as Error).message });
      }
    },
  );

  app.patch(
    "/service-records/:id/cancel",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = mutationBodySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid cancel payload" });
        return;
      }
      try {
        const output = await deps.cancel.execute({
          serviceRecordId: params.data.id,
          reason: body.data.reason,
          expectedRevision: body.data.expectedRevision,
          performedBy: request.operator!.accountId,
        });
        await reply.status(200).send({ data: output });
      } catch (error) {
        const status = toStatusCode(error);
        if (status === 500) throw error;
        await reply.status(status).send({ code: (error as DomainError).code, message: (error as Error).message });
      }
    },
  );

  app.patch(
    "/service-records/:id/note",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = noteBodySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid note correction payload" });
        return;
      }
      try {
        const output = await deps.correctNote.execute({
          serviceRecordId: params.data.id,
          newNote: body.data.newNote,
          reason: body.data.reason,
          expectedRevision: body.data.expectedRevision,
          performedBy: request.operator!.accountId,
        });
        await reply.status(200).send({ data: output });
      } catch (error) {
        const status = toStatusCode(error);
        if (status === 500) throw error;
        await reply.status(status).send({ code: (error as DomainError).code, message: (error as Error).message });
      }
    },
  );

  app.get(
    "/service-records/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid service record id" });
        return;
      }
      try {
        const output = await deps.get.execute({ serviceRecordId: params.data.id });
        await reply.status(200).send({ data: output });
      } catch (error) {
        const status = toStatusCode(error);
        if (status === 500) throw error;
        await reply.status(status).send({ code: (error as DomainError).code, message: (error as Error).message });
      }
    },
  );

  app.get(
    "/service-records",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid service record query" });
        return;
      }
      try {
        const output = await deps.listByFamily.execute(query.data);
        await reply.status(200).send({ data: output });
      } catch (error) {
        const status = toStatusCode(error);
        if (status === 500) throw error;
        await reply.status(status).send({ code: (error as DomainError).code, message: (error as Error).message });
      }
    },
  );
}
