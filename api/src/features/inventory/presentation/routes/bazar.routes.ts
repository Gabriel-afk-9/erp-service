import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { DomainError } from "../../../../shared/domain/errors/domain.error.js";
import { authorize } from "../../../../shared/presentation/middleware/authorize.middleware.js";
import type { GetBazarTransferUseCase } from "../../application/use-cases/get-bazar-transfer/get-bazar-transfer.use-case.js";
import type { ListBazarTransfersUseCase } from "../../application/use-cases/list-bazar-transfers/list-bazar-transfers.use-case.js";
import type { RegisterBazarTransferUseCase } from "../../application/use-cases/register-bazar-transfer/register-bazar-transfer.use-case.js";
import { BazarTransferNotFoundError } from "../../domain/errors/bazar-transfer-not-found.error.js";
import { ItemInactiveError } from "../../domain/errors/item-inactive.error.js";
import { ItemNotFoundError } from "../../domain/errors/item-not-found.error.js";
import { LotExpirationRequiredError } from "../../domain/errors/lot-expiration-required.error.js";
import { ReceiptInvalidError } from "../../domain/errors/receipt-invalid.error.js";
import { ReceiptLineInvalidError } from "../../domain/errors/receipt-line-invalid.error.js";
import { ReceiptNotFoundError } from "../../domain/errors/receipt-not-found.error.js";
import { ReceiptOperationConflictError } from "../../domain/errors/receipt-operation-conflict.error.js";
import { UnitMismatchError } from "../../domain/errors/unit-mismatch.error.js";

export interface BazarRouteDeps {
  register: RegisterBazarTransferUseCase;
  get: GetBazarTransferUseCase;
  list: ListBazarTransfersUseCase;
}

function toStatusCode(error: unknown): number {
  if (error instanceof BazarTransferNotFoundError || error instanceof ReceiptNotFoundError || error instanceof ItemNotFoundError) {
    return 404;
  }
  if (error instanceof ReceiptOperationConflictError) {
    return 409;
  }
  if (
    error instanceof ReceiptInvalidError ||
    error instanceof ReceiptLineInvalidError ||
    error instanceof UnitMismatchError ||
    error instanceof LotExpirationRequiredError ||
    error instanceof ItemInactiveError
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

const bazarLineSchema = z.object({
  itemId: z.string().uuid(),
  informedQuantity: z.number().nonnegative(),
  receivedQuantity: z.number().nonnegative(),
  acceptedQuantity: z.number().nonnegative(),
  rejectedQuantity: z.number().nonnegative(),
  rejectionReason: z.string().max(500).nullish(),
  expiresOn: z.string().regex(CIVIL_DATE).nullish(),
});

const registerBodySchema = z
  .object({
    externalReference: z.string().min(1).max(200),
    donorName: z.string().max(200).nullish(),
    receivedAt: z.string().regex(CIVIL_DATE),
    note: z.string().max(500).nullish(),
    operationKey: z.string().uuid(),
    lines: z.array(bazarLineSchema).min(1),
  })
  .strict();

const idParamsSchema = z.object({ id: z.string().min(1) }).strict();

export async function registerBazarRoutes(app: FastifyInstance, deps: BazarRouteDeps): Promise<void> {
  app.post(
    "/inventory/bazar-transfers",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const parsed = registerBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid bazar transfer payload" });
        return;
      }
      try {
        const output = await deps.register.execute({ ...parsed.data, actorId: request.operator!.accountId });
        await reply.status(output.duplicate ? 200 : 201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/bazar-transfers",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = z
        .object({ from: z.string().regex(CIVIL_DATE).optional(), to: z.string().regex(CIVIL_DATE).optional() })
        .strict()
        .safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid bazar transfer query" });
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
    "/inventory/bazar-transfers/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid bazar transfer id" });
        return;
      }
      try {
        const output = await deps.get.execute({ transferId: params.data.id });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );
}
