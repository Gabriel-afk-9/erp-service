import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { DomainError } from "../../../../shared/domain/errors/domain.error.js";
import { ConcurrentModificationError } from "../../../../shared/domain/errors/concurrent-modification.error.js";
import { authorize } from "../../../../shared/presentation/middleware/authorize.middleware.js";
import type { CorrectPersonUseCase } from "../../application/use-cases/correct-person/correct-person.use-case.js";
import type { GetPersonUseCase } from "../../application/use-cases/get-person/get-person.use-case.js";
import type { RegisterPersonUseCase } from "../../application/use-cases/register-person/register-person.use-case.js";
import type { SearchPersonsUseCase } from "../../application/use-cases/search-persons/search-persons.use-case.js";
import { CpfFormatError } from "../../domain/errors/cpf-format.error.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import { HolderAlreadyExistsError } from "../../domain/errors/holder-already-exists.error.js";
import { InvalidDateRangeError } from "../../domain/errors/invalid-date-range.error.js";
import { PersonAlreadyMemberError } from "../../domain/errors/person-already-member.error.js";
import { PersonNameInvalidError } from "../../domain/errors/person-name-invalid.error.js";
import { PersonNotFoundError } from "../../domain/errors/person-not-found.error.js";
import { TextTooLongError } from "../../domain/errors/text-too-long.error.js";
import { CivilDateFormatError } from "../../../../shared/domain/errors/civil-date-format.error.js";

export interface PersonRouteDeps {
  register: RegisterPersonUseCase;
  get: GetPersonUseCase;
  correct: CorrectPersonUseCase;
  search: SearchPersonsUseCase;
}

function toStatusCode(error: unknown): number {
  if (error instanceof PersonNotFoundError || error instanceof FamilyNotFoundError) {
    return 404;
  }
  if (
    error instanceof PersonAlreadyMemberError ||
    error instanceof HolderAlreadyExistsError ||
    error instanceof ConcurrentModificationError
  ) {
    return 409;
  }
  if (
    error instanceof InvalidDateRangeError ||
    error instanceof CpfFormatError ||
    error instanceof PersonNameInvalidError ||
    error instanceof TextTooLongError ||
    error instanceof CivilDateFormatError
  ) {
    return 422;
  }
  return 500;
}

async function sendError(reply: FastifyReply, error: unknown): Promise<void> {
  const status = toStatusCode(error);
  if (status === 500) throw error;
  await reply.status(status).send({ code: (error as DomainError).code, message: (error as Error).message });
}

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(raw: string): boolean {
  if (!CIVIL_DATE_PATTERN.test(raw)) return false;
  const [yearRaw, monthRaw, dayRaw] = raw.split("-");
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(Date.UTC(Number(yearRaw), month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

const civilDateField = z.string().trim().refine(isCalendarDate, { message: "Expected a valid YYYY-MM-DD calendar date" });

const registerPersonBodySchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    birthDate: civilDateField.nullish(),
    sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullish(),
    cpf: z.string().trim().max(50).nullish(),
    rg: z.string().trim().max(30).nullish(),
    occupation: z.string().trim().max(100).nullish(),
    educationLevel: z.string().trim().max(100).nullish(),
    contactPhone: z.string().trim().max(50).nullish(),
    familyId: z.string().trim().uuid(),
    validFrom: civilDateField,
    relationshipToReference: z.string().trim().max(100).nullish(),
    isReference: z.boolean(),
  })
  .strict();

const correctPersonBodySchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    contactPhone: z.string().trim().max(50).nullish(),
    occupation: z.string().trim().max(100).nullish(),
    educationLevel: z.string().trim().max(100).nullish(),
    reason: z.string().trim().min(3).max(1000),
    expectedRevision: z.number().int().positive(),
  })
  .strict();

const idParamsSchema = z.object({ id: z.string().trim().uuid() }).strict();

const listQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(200).optional(),
    cpf: z.string().trim().max(50).optional(),
    familyId: z.string().trim().uuid().optional(),
    page: z.coerce.number().int().min(1).max(100).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    asOf: civilDateField.optional(),
  })
  .strict();

export async function registerPersonRoutes(app: FastifyInstance, deps: PersonRouteDeps): Promise<void> {
  app.post(
    "/persons",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const parsed = registerPersonBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid person payload", details: parsed.error.flatten().fieldErrors });
        return;
      }
      try {
        const output = await deps.register.execute({ ...parsed.data, actorId: request.operator!.accountId });
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/persons",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid person query", details: query.error.flatten().fieldErrors });
        return;
      }
      try {
        const output = await deps.search.execute(query.data);
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/persons/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const query = listQuerySchema.safeParse(request.query);
      if (!params.success || !query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid person id", details: !params.success ? params.error.flatten().fieldErrors : query.success === false ? query.error.flatten().fieldErrors : undefined });
        return;
      }
      try {
        const output = await deps.get.execute({ personId: params.data.id, asOf: query.data.asOf });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.patch(
    "/persons/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = correctPersonBodySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid person correction payload", details: !body.success ? body.error.flatten().fieldErrors : params.success === false ? params.error.flatten().fieldErrors : undefined });
        return;
      }
      try {
        const output = await deps.correct.execute({
          ...body.data,
          personId: params.data.id,
          actorId: request.operator!.accountId,
        });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );
}
