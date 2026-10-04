import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { DomainError } from "../../../../shared/domain/errors/domain.error.js";
import type { OperatorRole } from "../../../../shared/domain/gateways/auth.gateway.js";
import { authorize } from "../../../../shared/presentation/middleware/authorize.middleware.js";
import type { DeliveryReportUseCase } from "../../application/use-cases/delivery-report/delivery-report.use-case.js";
import type { StockMovementReportUseCase } from "../../application/use-cases/stock-movement-report/stock-movement-report.use-case.js";
import { ReportChangedError } from "../../domain/errors/report-changed.error.js";
import { ReportInvalidPeriodError } from "../../domain/errors/report-invalid-period.error.js";

export interface ReportRouteDeps {
  stockMovements: StockMovementReportUseCase;
  deliveries: DeliveryReportUseCase;
}

const READ_ROLES: OperatorRole[] = ["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"];

function toStatusCode(error: unknown): number {
  if (error instanceof ReportChangedError) return 409;
  if (error instanceof ReportInvalidPeriodError) return 422;
  return 500;
}

async function sendError(reply: FastifyReply, error: unknown): Promise<void> {
  const status = toStatusCode(error);
  if (status === 500) throw error;
  await reply.status(status).send({ code: (error as DomainError).code, message: (error as Error).message });
}

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MOVEMENT_TYPES = [
  "DONATION_IN",
  "BAZAR_IN",
  "TRIAGE_DISCARD",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "OPENING_BALANCE",
  "DELIVERY_OUT",
  "DELIVERY_REVERSAL",
] as const;

const stockQuerySchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    from: z.string().regex(CIVIL_DATE),
    itemId: z.string().uuid().optional(),
    movementType: z.enum(MOVEMENT_TYPES).optional(),
    to: z.string().regex(CIVIL_DATE),
  })
  .strict();

const stockRecordsQuerySchema = stockQuerySchema.extend({
  expectedQueryFingerprint: z.string().min(1),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const deliveryQuerySchema = z
  .object({
    familyId: z.string().min(1).optional(),
    from: z.string().regex(CIVIL_DATE),
    status: z.enum(["COMPLETED", "REVERSED"]).optional(),
    to: z.string().regex(CIVIL_DATE),
  })
  .strict();

const deliveryRecordsQuerySchema = deliveryQuerySchema.extend({
  expectedQueryFingerprint: z.string().min(1),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export async function registerReportRoutes(app: FastifyInstance, deps: ReportRouteDeps): Promise<void> {
  app.get(
    "/reports/stock-movements",
    { preHandler: [authorize(READ_ROLES)] },
    async (request, reply) => {
      const query = stockQuerySchema.safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid stock report query" });
        return;
      }
      try {
        const output = await deps.stockMovements.execute(query.data);
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/reports/stock-movements/records",
    { preHandler: [authorize(READ_ROLES)] },
    async (request, reply) => {
      const query = stockRecordsQuerySchema.safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid stock report records query" });
        return;
      }
      try {
        const output = await deps.stockMovements.execute(query.data);
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/reports/deliveries",
    { preHandler: [authorize(READ_ROLES)] },
    async (request, reply) => {
      const query = deliveryQuerySchema.safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid delivery report query" });
        return;
      }
      try {
        const output = await deps.deliveries.execute(query.data);
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/reports/deliveries/records",
    { preHandler: [authorize(READ_ROLES)] },
    async (request, reply) => {
      const query = deliveryRecordsQuerySchema.safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid delivery report records query" });
        return;
      }
      try {
        const output = await deps.deliveries.execute(query.data);
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );
}
