import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { ConcurrentModificationError } from "../../../../shared/domain/errors/concurrent-modification.error.js";
import { DomainError } from "../../../../shared/domain/errors/domain.error.js";
import { authorize } from "../../../../shared/presentation/middleware/authorize.middleware.js";
import type { CreateCategoryUseCase } from "../../application/use-cases/create-category/create-category.use-case.js";
import type { CreateItemUseCase } from "../../application/use-cases/create-item/create-item.use-case.js";
import type { CreateUnitUseCase } from "../../application/use-cases/create-unit/create-unit.use-case.js";
import type { DeactivateCategoryUseCase } from "../../application/use-cases/deactivate-category/deactivate-category.use-case.js";
import type { DeactivateItemUseCase } from "../../application/use-cases/deactivate-item/deactivate-item.use-case.js";
import type { GetCategoryUseCase } from "../../application/use-cases/get-category/get-category.use-case.js";
import type { GetItemUseCase } from "../../application/use-cases/get-item/get-item.use-case.js";
import type { ListCategoriesUseCase } from "../../application/use-cases/list-categories/list-categories.use-case.js";
import type { ListItemsUseCase } from "../../application/use-cases/list-items/list-items.use-case.js";
import type { ListUnitsUseCase } from "../../application/use-cases/list-units/list-units.use-case.js";
import type { UpdateCategoryUseCase } from "../../application/use-cases/update-category/update-category.use-case.js";
import type { UpdateItemUseCase } from "../../application/use-cases/update-item/update-item.use-case.js";
import { CategoryInactiveError } from "../../domain/errors/category-inactive.error.js";
import { CategoryNameAlreadyExistsError } from "../../domain/errors/category-name-already-exists.error.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { DecimalPlacesInvalidError } from "../../domain/errors/decimal-places-invalid.error.js";
import { ItemInactiveError } from "../../domain/errors/item-inactive.error.js";
import { ItemNameAlreadyExistsInCategoryError } from "../../domain/errors/item-name-already-exists-in-category.error.js";
import { ItemNotFoundError } from "../../domain/errors/item-not-found.error.js";
import { QuantityIncrementInvalidError } from "../../domain/errors/quantity-increment-invalid.error.js";
import { UnitNotFoundError } from "../../domain/errors/unit-not-found.error.js";
import { UnitSymbolAlreadyExistsError } from "../../domain/errors/unit-symbol-already-exists.error.js";

export interface InventoryRouteDeps {
  createCategory: CreateCategoryUseCase;
  updateCategory: UpdateCategoryUseCase;
  deactivateCategory: DeactivateCategoryUseCase;
  listCategories: ListCategoriesUseCase;
  getCategory: GetCategoryUseCase;
  createUnit: CreateUnitUseCase;
  listUnits: ListUnitsUseCase;
  createItem: CreateItemUseCase;
  updateItem: UpdateItemUseCase;
  deactivateItem: DeactivateItemUseCase;
  listItems: ListItemsUseCase;
  getItem: GetItemUseCase;
}

function toStatusCode(error: unknown): number {
  if (
    error instanceof CategoryNotFoundError ||
    error instanceof UnitNotFoundError ||
    error instanceof ItemNotFoundError
  ) {
    return 404;
  }
  if (
    error instanceof CategoryNameAlreadyExistsError ||
    error instanceof UnitSymbolAlreadyExistsError ||
    error instanceof ItemNameAlreadyExistsInCategoryError ||
    error instanceof ConcurrentModificationError
  ) {
    return 409;
  }
  if (
    error instanceof CategoryInactiveError ||
    error instanceof ItemInactiveError ||
    error instanceof DecimalPlacesInvalidError ||
    error instanceof QuantityIncrementInvalidError
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

const idParamsSchema = z.object({ id: z.string().min(1) }).strict();
const reasonSchema = z.object({
  reason: z.string().min(3),
  expectedRevision: z.number().int().positive(),
});

export async function registerInventoryRoutes(app: FastifyInstance, deps: InventoryRouteDeps): Promise<void> {
  app.post(
    "/inventory/categories",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const parsed = z
        .object({ name: z.string().min(2).max(100), description: z.string().max(500).optional() })
        .strict()
        .safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid category payload" });
        return;
      }
      try {
        const output = await deps.createCategory.execute(parsed.data);
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/categories",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = z
        .object({ q: z.string().optional(), onlyActive: z.coerce.boolean().optional() })
        .strict()
        .safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid category query" });
        return;
      }
      try {
        const output = await deps.listCategories.execute({ q: query.data.q, onlyActive: query.data.onlyActive ?? true });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/categories/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid category id" });
        return;
      }
      try {
        const output = await deps.getCategory.execute({ categoryId: params.data.id });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.patch(
    "/inventory/categories/:id",
    { preHandler: [authorize(["COORDINATION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = z
        .object({
          name: z.string().min(2).max(100).optional(),
          description: z.string().max(500).nullish(),
          reason: z.string().min(3),
          expectedRevision: z.number().int().positive(),
        })
        .strict()
        .safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid category update payload" });
        return;
      }
      try {
        const output = await deps.updateCategory.execute({ categoryId: params.data.id, ...body.data });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/inventory/categories/:id/deactivation",
    { preHandler: [authorize(["COORDINATION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = reasonSchema.strict().safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid category deactivation payload" });
        return;
      }
      try {
        const output = await deps.deactivateCategory.execute({ categoryId: params.data.id, ...body.data });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/inventory/units",
    { preHandler: [authorize(["COORDINATION"])] },
    async (request, reply) => {
      const parsed = z
        .object({
          symbol: z.string().min(1).max(20),
          name: z.string().min(2).max(100),
          decimalPlaces: z.number().int().min(0).max(4),
          quantityIncrement: z.number().positive(),
        })
        .strict()
        .safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid unit payload" });
        return;
      }
      try {
        const output = await deps.createUnit.execute(parsed.data);
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/units",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = z
        .object({ onlyActive: z.coerce.boolean().optional() })
        .strict()
        .safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid unit query" });
        return;
      }
      try {
        const output = await deps.listUnits.execute({ onlyActive: query.data.onlyActive ?? true });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/inventory/items",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const parsed = z
        .object({
          categoryId: z.string().uuid(),
          unitId: z.string().uuid(),
          name: z.string().min(2).max(200),
          description: z.string().max(500).optional(),
          requiresExpiration: z.boolean(),
        })
        .strict()
        .safeParse(request.body);
      if (!parsed.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid item payload" });
        return;
      }
      try {
        const output = await deps.createItem.execute(parsed.data);
        await reply.status(201).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/items",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = z
        .object({ q: z.string().optional(), categoryId: z.string().uuid().optional(), onlyActive: z.coerce.boolean().optional() })
        .strict()
        .safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid item query" });
        return;
      }
      try {
        const output = await deps.listItems.execute({
          q: query.data.q,
          categoryId: query.data.categoryId,
          onlyActive: query.data.onlyActive ?? true,
        });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.get(
    "/inventory/items/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid item id" });
        return;
      }
      try {
        const output = await deps.getItem.execute({ itemId: params.data.id });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.patch(
    "/inventory/items/:id",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = z
        .object({
          name: z.string().min(2).max(200).optional(),
          description: z.string().max(500).nullish(),
          requiresExpiration: z.boolean().optional(),
          reason: z.string().min(3),
          expectedRevision: z.number().int().positive(),
        })
        .strict()
        .safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid item update payload" });
        return;
      }
      try {
        const output = await deps.updateItem.execute({ itemId: params.data.id, ...body.data });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );

  app.post(
    "/inventory/items/:id/deactivation",
    { preHandler: [authorize(["COORDINATION"])] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      const body = reasonSchema.strict().safeParse(request.body);
      if (!params.success || !body.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid item deactivation payload" });
        return;
      }
      try {
        const output = await deps.deactivateItem.execute({ itemId: params.data.id, ...body.data });
        await reply.status(200).send({ data: output });
      } catch (error) {
        await sendError(reply, error);
      }
    },
  );
}
