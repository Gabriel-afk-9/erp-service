import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { DomainError } from "../../../../shared/domain/errors/domain.error.js";
import { ConcurrentModificationError } from "../../../../shared/domain/errors/concurrent-modification.error.js";
import { authorize } from "../../../../shared/presentation/middleware/authorize.middleware.js";
import type { AddFamilyMemberUseCase } from "../../application/use-cases/add-family-member/add-family-member.use-case.js";
import type { CorrectFamilyUseCase } from "../../application/use-cases/correct-family/correct-family.use-case.js";
import type { CreateFamilyUseCase } from "../../application/use-cases/create-family/create-family.use-case.js";
import type { EndFamilyMembershipUseCase } from "../../application/use-cases/end-family-membership/end-family-membership.use-case.js";
import type { GetFamilyUseCase } from "../../application/use-cases/get-family/get-family.use-case.js";
import type { SearchFamiliesUseCase } from "../../application/use-cases/search-families/search-families.use-case.js";
import { FamilyCodeAlreadyExistsError } from "../../domain/errors/family-code-already-exists.error.js";
import { FamilyCodeInvalidError } from "../../domain/errors/family-code-invalid.error.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import { HolderAlreadyExistsError } from "../../domain/errors/holder-already-exists.error.js";
import { InvalidDateRangeError } from "../../domain/errors/invalid-date-range.error.js";
import { MembershipNotFoundError } from "../../domain/errors/membership-not-found.error.js";
import { PersonAlreadyMemberError } from "../../domain/errors/person-already-member.error.js";
import { PersonNotFoundError } from "../../domain/errors/person-not-found.error.js";
import { PostalCodeInvalidError } from "../../domain/errors/postal-code-invalid.error.js";
import { TextTooLongError } from "../../domain/errors/text-too-long.error.js";
import { CivilDateFormatError } from "../../../../shared/domain/errors/civil-date-format.error.js";

export interface FamilyRouteDeps {
  create: CreateFamilyUseCase;
  get: GetFamilyUseCase;
  correct: CorrectFamilyUseCase;
  search: SearchFamiliesUseCase;
  addMember: AddFamilyMemberUseCase;
  endMembership: EndFamilyMembershipUseCase;
}

function toStatusCode(error: unknown): number {
  if (
    error instanceof FamilyNotFoundError ||
    error instanceof PersonNotFoundError ||
    error instanceof MembershipNotFoundError
  ) {
    return 404;
  }
  if (
    error instanceof FamilyCodeAlreadyExistsError ||
    error instanceof PersonAlreadyMemberError ||
    error instanceof HolderAlreadyExistsError ||
    error instanceof ConcurrentModificationError
  ) {
    return 409;
  }
  if (
    error instanceof InvalidDateRangeError ||
    error instanceof FamilyCodeInvalidError ||
    error instanceof PostalCodeInvalidError ||
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

const createFamilyBodySchema = z
  .object({
    referenceName: z.string().trim().max(500).nullish(),
    address: z.string().trim().max(500).nullish(),
    neighborhood: z.string().trim().max(500).nullish(),
    postalCode: z.string().trim().max(50).nullish(),
    locationType: z.enum(["URBAN", "RURAL"]),
    contactPhone: z.string().trim().max(50).nullish(),
  })
  .strict();

const correctFamilyBodySchema = z
  .object({
    referenceName: z.string().trim().max(500).nullish(),
    address: z.string().trim().max(500).nullish(),
    neighborhood: z.string().trim().max(500).nullish(),
    postalCode: z.string().trim().max(50).nullish(),
    locationType: z.enum(["URBAN", "RURAL"]).optional(),
    contactPhone: z.string().trim().max(50).nullish(),
    reason: z.string().trim().min(3).max(1000),
    expectedRevision: z.number().int().positive(),
  })
  .strict();

const addMemberBodySchema = z
  .object({
    personId: z.string().trim().uuid(),
    validFrom: civilDateField,
    relationshipToReference: z.string().trim().max(100).nullish(),
    isReference: z.boolean(),
  })
  .strict();

const closureBodySchema = z
  .object({
    validUntil: civilDateField,
    reason: z.string().trim().min(3).max(1000),
    expectedRevision: z.number().int().positive(),
  })
  .strict();

const idParamsSchema = z.object({ id: z.string().trim().uuid() }).strict();

const listQuerySchema = z
  .object({
    q: z.string().trim().min(2).max(200).optional(),
    code: z.string().trim().max(50).optional(),
    page: z.coerce.number().int().min(1).max(100).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    asOf: civilDateField.optional(),
  })
  .strict();

export async function registerFamilyRoutes(app: FastifyInstance, deps: FamilyRouteDeps): Promise<void> {
  app.post(
    "/families",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const parsed = createFamilyBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid family payload", details: parsed.error.flatten().fieldErrors });
        return;
      }
      try {
        const output = await deps.create.execute({ ...parsed.data, actorId: request.operator!.accountId });
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/families",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid family query", details: query.error.flatten().fieldErrors });
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
    "/families/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const query = listQuerySchema.safeParse(request.query);
      if (!params.success || !query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid family id", details: !params.success ? params.error.flatten().fieldErrors : query.success === false ? query.error.flatten().fieldErrors : undefined });
        return;
      }
      try {
        const output = await deps.get.execute({ familyId: params.data.id, asOf: query.data.asOf });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.patch(
    "/families/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = correctFamilyBodySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid family correction payload", details: !body.success ? body.error.flatten().fieldErrors : params.success === false ? params.error.flatten().fieldErrors : undefined });
        return;
      }
      try {
        const output = await deps.correct.execute({
          ...body.data,
          familyId: params.data.id,
          actorId: request.operator!.accountId,
        });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/families/:id/members",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = addMemberBodySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid family member payload", details: !body.success ? body.error.flatten().fieldErrors : params.success === false ? params.error.flatten().fieldErrors : undefined });
        return;
      }
      try {
        const output = await deps.addMember.execute({
          ...body.data,
          familyId: params.data.id,
          actorId: request.operator!.accountId,
        });
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/memberships/:id/closure",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = closureBodySchema.safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid membership closure payload", details: !body.success ? body.error.flatten().fieldErrors : params.success === false ? params.error.flatten().fieldErrors : undefined });
        return;
      }
      try {
        const output = await deps.endMembership.execute({
          ...body.data,
          membershipId: params.data.id,
          actorId: request.operator!.accountId,
        });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );
}
