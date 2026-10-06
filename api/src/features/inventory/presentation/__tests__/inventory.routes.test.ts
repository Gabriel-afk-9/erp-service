import bcrypt from "bcrypt";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { CategoryNameAlreadyExistsError } from "../../domain/errors/category-name-already-exists.error.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { ConcurrentModificationError } from "../../../../shared/domain/errors/concurrent-modification.error.js";
import { JwtAuthGateway } from "../../../../shared/infrastructure/gateways/jwt-auth.gateway.js";
import { makeAuthenticateMiddleware } from "../../../../shared/presentation/middleware/authenticate.middleware.js";
import { registerInventoryRoutes } from "../routes/inventory.routes.js";

const OPERATOR_ID = "11111111-1111-1111-1111-111111111111";

async function buildApp(overrides: Record<string, { execute: (input: never) => Promise<unknown> }> = {}) {
  const passwordHash = await bcrypt.hash("senha123", 4);
  const auth = new JwtAuthGateway([
    { accountId: OPERATOR_ID, login: "coordenacao", password: "senha123", passwordHash, name: "Coordenacao", role: "COORDINATION" },
    { accountId: "22222222-2222-2222-2222-222222222222", login: "estoque", password: "senha123", passwordHash, name: "Estoque", role: "STOCK_DISTRIBUTION" },
  ]);
  const app = Fastify();
  const authenticate = makeAuthenticateMiddleware(auth);
  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health") return;
    await authenticate(request, reply);
  });
  const stub = (value: unknown) => ({ execute: async () => value });
  await registerInventoryRoutes(app, {
    createCategory: (overrides.createCategory ?? stub({ categoryId: OPERATOR_ID, name: "Alimentos", revision: 1 })) as never,
    updateCategory: (overrides.updateCategory ?? stub({ categoryId: OPERATOR_ID, revision: 2 })) as never,
    deactivateCategory: (overrides.deactivateCategory ?? stub({ categoryId: OPERATOR_ID, isActive: false })) as never,
    listCategories: (overrides.listCategories ?? stub({ categories: [] })) as never,
    getCategory: (overrides.getCategory ?? stub({ categoryId: OPERATOR_ID, name: "Alimentos", items: [] })) as never,
    createUnit: (overrides.createUnit ?? stub({ unitId: OPERATOR_ID, symbol: "KG" })) as never,
    listUnits: (overrides.listUnits ?? stub({ units: [] })) as never,
    createItem: (overrides.createItem ?? stub({ itemId: OPERATOR_ID, name: "Arroz", revision: 1 })) as never,
    updateItem: (overrides.updateItem ?? stub({ itemId: OPERATOR_ID, revision: 2 })) as never,
    deactivateItem: (overrides.deactivateItem ?? stub({ itemId: OPERATOR_ID, isActive: false })) as never,
    listItems: (overrides.listItems ?? stub({ items: [] })) as never,
    getItem: (overrides.getItem ?? stub({ itemId: OPERATOR_ID })) as never,
  });
  const tokenResponse = await auth.authenticate("coordenacao", "senha123");
  return { app, coordToken: tokenResponse.token, auth };
}

async function stockToken(app: ReturnType<typeof Fastify>, auth: JwtAuthGateway): Promise<string> {
  void app;
  const result = await auth.authenticate("estoque", "senha123");
  return result.token;
}

describe("inventory routes", () => {
  it("POST /inventory/categories without name returns 400", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/categories",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("POST /inventory/categories valid returns 201", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/categories",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { name: "Alimentos" },
    });
    expect(response.statusCode).toBe(201);
  });

  it("POST /inventory/categories duplicate returns 409", async () => {
    const { app, coordToken } = await buildApp({
      createCategory: { execute: async () => { throw new CategoryNameAlreadyExistsError("Alimentos"); } },
    });
    const response = await app.inject({
      method: "POST",
      url: "/inventory/categories",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { name: "Alimentos" },
    });
    expect(response.statusCode).toBe(409);
  });

  it("POST /inventory/units without decimalPlaces returns 400", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/units",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { symbol: "KG", name: "Quilograma", quantityIncrement: 0.1 },
    });
    expect(response.statusCode).toBe(400);
  });

  it("POST /inventory/units with decimalPlaces 5 returns 400 from Zod", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/units",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { symbol: "KG", name: "Quilograma", decimalPlaces: 5, quantityIncrement: 0.1 },
    });
    expect(response.statusCode).toBe(400);
  });

  it("POST /inventory/items without requiresExpiration returns 400", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/items",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { categoryId: OPERATOR_ID, unitId: OPERATOR_ID, name: "Arroz" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("POST /inventory/items with inactive category returns 422", async () => {
    const { app, coordToken } = await buildApp();
    const { CategoryInactiveError } = await import("../../domain/errors/category-inactive.error.js");
    const failing = { execute: async () => { throw new CategoryInactiveError(OPERATOR_ID); } };
    const passwordHash = await bcrypt.hash("senha123", 4);
    const auth = new JwtAuthGateway([
      { accountId: OPERATOR_ID, login: "coordenacao", password: "senha123", passwordHash, name: "Coordenacao", role: "COORDINATION" },
    ]);
    const isolated = Fastify();
    const authenticate = makeAuthenticateMiddleware(auth);
    isolated.addHook("onRequest", async (request, reply) => {
      await authenticate(request, reply);
    });
    await registerInventoryRoutes(isolated, {
      createCategory: { execute: async () => ({}) } as never,
      updateCategory: { execute: async () => ({}) } as never,
      deactivateCategory: { execute: async () => ({}) } as never,
      listCategories: { execute: async () => ({ categories: [] }) } as never,
      getCategory: { execute: async () => ({}) } as never,
      createUnit: { execute: async () => ({}) } as never,
      listUnits: { execute: async () => ({ units: [] }) } as never,
      createItem: failing as never,
      updateItem: { execute: async () => ({}) } as never,
      deactivateItem: { execute: async () => ({}) } as never,
      listItems: { execute: async () => ({ items: [] }) } as never,
      getItem: { execute: async () => ({}) } as never,
    });
    const token = (await auth.authenticate("coordenacao", "senha123")).token;
    const response = await isolated.inject({
      method: "POST",
      url: "/inventory/items",
      headers: { authorization: `Bearer ${token}` },
      payload: { categoryId: OPERATOR_ID, unitId: OPERATOR_ID, name: "Arroz", requiresExpiration: true },
    });
    expect(response.statusCode).toBe(422);
    expect(coordToken).toBeTruthy();
  });

  it("GET /inventory/items with unknown categoryId returns 400 from Zod uuid", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/inventory/items?categoryId=inexistente",
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(response.statusCode).toBe(400);
  });

  it("PATCH /inventory/categories/:id stale revision returns 409", async () => {
    const { app, coordToken } = await buildApp({
      updateCategory: { execute: async () => { throw new ConcurrentModificationError(1, 2); } },
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/inventory/categories/${OPERATOR_ID}`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { name: "Novo", reason: "Correcao", expectedRevision: 1 },
    });
    expect(response.statusCode).toBe(409);
  });

  it("STOCK_DISTRIBUTION creating category returns 403", async () => {
    const { app, auth } = await buildApp();
    const token = await stockToken(app, auth);
    const response = await app.inject({
      method: "POST",
      url: "/inventory/categories",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Alimentos" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("GET unknown category returns 404", async () => {
    const { app, coordToken } = await buildApp({
      getCategory: { execute: async () => { throw new CategoryNotFoundError(OPERATOR_ID); } },
    });
    const response = await app.inject({
      method: "GET",
      url: `/inventory/categories/${OPERATOR_ID}`,
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(response.statusCode).toBe(404);
  });
});
