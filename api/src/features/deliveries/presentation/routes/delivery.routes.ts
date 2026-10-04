import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { DomainError } from "../../../../shared/domain/errors/domain.error.js";
import { authorize } from "../../../../shared/presentation/middleware/authorize.middleware.js";
import { ReasonRequiredError } from "../../../atd/domain/errors/reason-required.error.js";
import type { ConfirmDeliveryUseCase } from "../../application/use-cases/confirm-delivery/confirm-delivery.use-case.js";
import type { GetDeliveryUseCase } from "../../application/use-cases/get-delivery/get-delivery.use-case.js";
import type { ListDeliveriesUseCase } from "../../application/use-cases/list-deliveries/list-deliveries.use-case.js";
import type { PreviewDeliveryUseCase } from "../../application/use-cases/preview-delivery/preview-delivery.use-case.js";
import type { ReverseDeliveryUseCase } from "../../application/use-cases/reverse-delivery/reverse-delivery.use-case.js";
import { CollectorNotMemberError } from "../../domain/errors/collector-not-member.error.js";
import { DeliveryLinesInvalidError } from "../../domain/errors/delivery-lines-invalid.error.js";
import { DeliveryNotFoundError } from "../../domain/errors/delivery-not-found.error.js";
import { DeliveryOperationConflictError } from "../../domain/errors/delivery-operation-conflict.error.js";
import { EligibilityJustificationRequiredError } from "../../domain/errors/eligibility-justification-required.error.js";
import { InsufficientBalanceError } from "../../domain/errors/insufficient-balance.error.js";

export interface DeliveryRouteDeps {
  confirm: ConfirmDeliveryUseCase;
  reverse: ReverseDeliveryUseCase;
  preview: PreviewDeliveryUseCase;
  get: GetDeliveryUseCase;
  list: ListDeliveriesUseCase;
}

function toStatusCode(error: unknown): number {
  if (error instanceof DeliveryNotFoundError) return 404;
  if (error instanceof DeliveryOperationConflictError) return 409;
  if (
    error instanceof DeliveryLinesInvalidError ||
    error instanceof InsufficientBalanceError ||
    error instanceof EligibilityJustificationRequiredError ||
    error instanceof CollectorNotMemberError ||
    error instanceof ReasonRequiredError
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

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

const deliveryLineSchema = z.object({
  lotId: z.string().uuid(),
  quantity: z.number().positive(),
});

const confirmBodySchema = z
  .object({
    familyId: z.string().min(1),
    occurredAt: z.string().regex(CIVIL_DATE),
    lines: z.array(deliveryLineSchema).min(1),
    collectedByPersonId: z.string().uuid().nullish(),
    executorName: z.string().min(2),
    executorRole: z.string().min(2),
    exceptionReason: z.string().min(3).max(500).nullish(),
    authorizedBy: z.string().min(1).max(200).nullish(),
    operationKey: z.string().uuid(),
  })
  .strict();

const idParamsSchema = z.object({ id: z.string().min(1) }).strict();

export async function registerDeliveryRoutes(app: FastifyInstance, deps: DeliveryRouteDeps): Promise<void> {
  app.get(
    "/deliveries/preview",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = z
        .object({ familyId: z.string().min(1), date: z.string().regex(CIVIL_DATE).optional() })
        .strict()
        .safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid delivery preview query" });
        return;
      }
      try {
        const output = await deps.preview.execute({ familyId: query.data.familyId, referenceDate: query.data.date });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/deliveries",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const parsed = confirmBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid delivery payload" });
        return;
      }
      try {
        const output = await deps.confirm.execute({ ...parsed.data, actorId: request.operator!.accountId });
        await reply.status(output.duplicate ? 200 : 201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/deliveries/:id/reversal",
    { preHandler: [authorize(["COORDINATION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = z
        .object({ reason: z.string().min(3).max(500), reversedAt: z.string().regex(CIVIL_DATE).optional() })
        .strict()
        .safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid reversal payload" });
        return;
      }
      try {
        const output = await deps.reverse.execute({
          deliveryId: params.data.id,
          reason: body.data.reason,
          reversedAt: body.data.reversedAt,
          actorId: request.operator!.accountId,
        });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/deliveries",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = z
        .object({ familyId: z.string().optional(), from: z.string().regex(CIVIL_DATE).optional(), to: z.string().regex(CIVIL_DATE).optional() })
        .strict()
        .safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid delivery query" });
        return;
      }
      try {
        const output = await deps.list.execute(query.data);
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/deliveries/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid delivery id" });
        return;
      }
      try {
        const output = await deps.get.execute({ deliveryId: params.data.id });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/families/:id/deliveries",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid family id" });
        return;
      }
      try {
        const output = await deps.list.execute({ familyId: params.data.id });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );
}
