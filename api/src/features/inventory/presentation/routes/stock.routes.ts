import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { DomainError } from "../../../../shared/domain/errors/domain.error.js";
import { authorize } from "../../../../shared/presentation/middleware/authorize.middleware.js";
import type { AdjustStockUseCase } from "../../application/use-cases/adjust-stock/adjust-stock.use-case.js";
import type { CloseStockCountUseCase } from "../../application/use-cases/close-count/close-count.use-case.js";
import type { ConfirmStockReceiptUseCase } from "../../application/use-cases/confirm-receipt/confirm-receipt.use-case.js";
import type { CreateStockCountUseCase } from "../../application/use-cases/create-count/create-count.use-case.js";
import type { GetItemBalanceUseCase } from "../../application/use-cases/get-item-balance/get-item-balance.use-case.js";
import type { GetItemMovementsUseCase } from "../../application/use-cases/get-item-movements/get-item-movements.use-case.js";
import type { GetReceiptUseCase } from "../../application/use-cases/get-receipt/get-receipt.use-case.js";
import type { ListItemsWithBalanceUseCase } from "../../application/use-cases/list-items-with-balance/list-items-with-balance.use-case.js";
import type { ListReceiptsUseCase } from "../../application/use-cases/list-receipts/list-receipts.use-case.js";
import type { RecordCountLineUseCase } from "../../application/use-cases/record-count-line/record-count-line.use-case.js";
import { CountClosedError } from "../../domain/errors/count-closed.error.js";
import { CountLineInvalidError } from "../../domain/errors/count-line-invalid.error.js";
import { CountNotFoundError } from "../../domain/errors/count-not-found.error.js";
import { DuplicateOpeningBalanceError } from "../../domain/errors/duplicate-opening-balance.error.js";
import { ItemInactiveError } from "../../domain/errors/item-inactive.error.js";
import { ItemNotFoundError } from "../../domain/errors/item-not-found.error.js";
import { LotExpirationRequiredError } from "../../domain/errors/lot-expiration-required.error.js";
import { MovementQuantityInvalidError } from "../../domain/errors/movement-quantity-invalid.error.js";
import { NegativeBalanceBlockedError } from "../../domain/errors/negative-balance-blocked.error.js";
import { ReceiptInvalidError } from "../../domain/errors/receipt-invalid.error.js";
import { ReceiptLineInvalidError } from "../../domain/errors/receipt-line-invalid.error.js";
import { ReceiptNotFoundError } from "../../domain/errors/receipt-not-found.error.js";
import { ReceiptOperationConflictError } from "../../domain/errors/receipt-operation-conflict.error.js";
import { UnitMismatchError } from "../../domain/errors/unit-mismatch.error.js";

export interface StockRouteDeps {
  confirmReceipt: ConfirmStockReceiptUseCase;
  getReceipt: GetReceiptUseCase;
  listReceipts: ListReceiptsUseCase;
  getItemBalance: GetItemBalanceUseCase;
  listItemsWithBalance: ListItemsWithBalanceUseCase;
  getItemMovements: GetItemMovementsUseCase;
  adjustStock: AdjustStockUseCase;
  createCount: CreateStockCountUseCase;
  recordCountLine: RecordCountLineUseCase;
  closeCount: CloseStockCountUseCase;
}

function toStatusCode(error: unknown): number {
  if (
    error instanceof ReceiptNotFoundError ||
    error instanceof CountNotFoundError ||
    error instanceof ItemNotFoundError
  ) {
    return 404;
  }
  if (
    error instanceof ReceiptOperationConflictError ||
    error instanceof DuplicateOpeningBalanceError ||
    error instanceof CountClosedError
  ) {
    return 409;
  }
  if (
    error instanceof ReceiptInvalidError ||
    error instanceof ReceiptLineInvalidError ||
    error instanceof UnitMismatchError ||
    error instanceof LotExpirationRequiredError ||
    error instanceof NegativeBalanceBlockedError ||
    error instanceof CountLineInvalidError ||
    error instanceof ItemInactiveError ||
    error instanceof MovementQuantityInvalidError
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
const ORIGIN_TYPES = ["PERSON", "ORGANIZATION", "CAMPAIGN", "AD_HOC", "UNKNOWN"] as const;

const receiptLineSchema = z.object({
  itemId: z.string().uuid(),
  informedQuantity: z.number().nonnegative().nullish(),
  receivedQuantity: z.number().nonnegative(),
  acceptedQuantity: z.number().nonnegative(),
  rejectedQuantity: z.number().nonnegative(),
  rejectionReason: z.string().max(500).nullish(),
  expiresOn: z.string().regex(CIVIL_DATE).nullish(),
});

const confirmReceiptBodySchema = z
  .object({
    originType: z.enum(ORIGIN_TYPES),
    donorName: z.string().max(200).nullish(),
    receivedAt: z.string().regex(CIVIL_DATE),
    note: z.string().max(500).nullish(),
    operationKey: z.string().uuid(),
    lines: z.array(receiptLineSchema).min(1),
  })
  .strict();

const idParamsSchema = z.object({ id: z.string().min(1) }).strict();

export async function registerStockRoutes(app: FastifyInstance, deps: StockRouteDeps): Promise<void> {
  app.post(
    "/inventory/receipts",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const parsed = confirmReceiptBodySchema.safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid receipt payload" });
        return;
      }
      try {
        const output = await deps.confirmReceipt.execute({ ...parsed.data, actorId: request.operator!.accountId });
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/receipts",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = z
        .object({ from: z.string().regex(CIVIL_DATE).optional(), to: z.string().regex(CIVIL_DATE).optional(), originType: z.enum(ORIGIN_TYPES).optional() })
        .strict()
        .safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid receipt query" });
        return;
      }
      try {
        const output = await deps.listReceipts.execute(query.data);
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/receipts/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid receipt id" });
        return;
      }
      try {
        const output = await deps.getReceipt.execute({ receiptId: params.data.id });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/balance",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = z
        .object({ q: z.string().optional(), categoryId: z.string().uuid().optional(), onlyActive: z.coerce.boolean().optional(), referenceDate: z.string().regex(CIVIL_DATE).optional() })
        .strict()
        .safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid balance query" });
        return;
      }
      try {
        const output = await deps.listItemsWithBalance.execute({
          q: query.data.q,
          categoryId: query.data.categoryId,
          onlyActive: query.data.onlyActive ?? true,
          referenceDate: query.data.referenceDate,
        });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/items/:id/balance",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const query = z.object({ referenceDate: z.string().regex(CIVIL_DATE).optional() }).strict().safeParse(request.query);
      if (!params.success || !query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid balance query" });
        return;
      }
      try {
        const output = await deps.getItemBalance.execute({ itemId: params.data.id, referenceDate: query.data.referenceDate });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/items/:id/movements",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const query = z.object({ to: z.string().regex(CIVIL_DATE).optional() }).strict().safeParse(request.query);
      if (!params.success || !query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid movements query" });
        return;
      }
      try {
        const output = await deps.getItemMovements.execute({ itemId: params.data.id, to: query.data.to });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/inventory/adjustments",
    { preHandler: [authorize(["COORDINATION"])] },
    async (request, reply) => {
      const parsed = z
        .object({
          itemId: z.string().uuid(),
          lotId: z.string().uuid().nullish(),
          quantity: z.number().positive(),
          direction: z.enum(["IN", "OUT"]),
          reason: z.string().min(3).max(500),
          occurredAt: z.string().regex(CIVIL_DATE).optional(),
          operationKey: z.string().uuid(),
        })
        .strict()
        .safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid adjustment payload" });
        return;
      }
      try {
        const output = await deps.adjustStock.execute({ ...parsed.data, actorId: request.operator!.accountId });
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/inventory/counts",
    { preHandler: [authorize(["COORDINATION"])] },
    async (request, reply) => {
      const parsed = z
        .object({ conductedAt: z.string().regex(CIVIL_DATE).optional(), note: z.string().max(500).nullish() })
        .strict()
        .safeParse(request.body ?? {});
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid count payload" });
        return;
      }
      try {
        const output = await deps.createCount.execute({ ...parsed.data, actorId: request.operator!.accountId });
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/inventory/counts/:id/lines",
    { preHandler: [authorize(["COORDINATION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = z
        .object({
          lotId: z.string().uuid().nullish(),
          itemId: z.string().uuid().optional(),
          unitId: z.string().uuid().optional(),
          expiresOn: z.string().regex(CIVIL_DATE).nullish(),
          countedQuantity: z.number().nonnegative(),
        })
        .strict()
        .safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid count line payload" });
        return;
      }
      try {
        const output = await deps.recordCountLine.execute({ countId: params.data.id, ...body.data });
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/inventory/counts/:id/closure",
    { preHandler: [authorize(["COORDINATION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = z
        .object({ closedAt: z.string().regex(CIVIL_DATE).optional() })
        .strict()
        .safeParse(request.body ?? {});
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid count closure payload" });
        return;
      }
      try {
        const output = await deps.closeCount.execute({ countId: params.data.id, closedAt: body.data.closedAt, actorId: request.operator!.accountId });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );
}
