import bcrypt from "bcrypt";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { BazarTransferNotFoundError } from "../../domain/errors/bazar-transfer-not-found.error.js";
import { JwtAuthGateway } from "../../../../shared/infrastructure/gateways/jwt-auth.gateway.js";
import { makeAuthenticateMiddleware } from "../../../../shared/presentation/middleware/authenticate.middleware.js";
import { registerBazarRoutes } from "../routes/bazar.routes.js";

const OPERATOR_ID = "11111111-1111-1111-1111-111111111111";
const ITEM_ID = "22222222-2222-2222-2222-222222222222";
const OP_KEY = "88888888-8888-8888-8888-888888888888";

async function buildApp(overrides: Record<string, { execute: (input: never) => Promise<unknown> }> = {}) {
  const passwordHash = await bcrypt.hash("senha123", 4);
  const auth = new JwtAuthGateway([
    { accountId: OPERATOR_ID, login: "coordenacao", password: "senha123", passwordHash, name: "Coordenacao", role: "COORDINATION" },
    { accountId: "44444444-4444-4444-4444-444444444444", login: "estoque", password: "senha123", passwordHash, name: "Estoque", role: "STOCK_DISTRIBUTION" },
  ]);
  const app = Fastify();
  const authenticate = makeAuthenticateMiddleware(auth);
  app.addHook("onRequest", async (request, reply) => {
    await authenticate(request, reply);
  });
  const stub = (value: unknown) => ({ execute: async () => value });
  await registerBazarRoutes(app, {
    register: (overrides.register ?? stub({ transferId: OPERATOR_ID, receiptId: OPERATOR_ID, duplicate: false })) as never,
    get: (overrides.get ?? stub({ transferId: OPERATOR_ID, lines: [] })) as never,
    list: (overrides.list ?? stub({ transfers: [] })) as never,
  });
  const token = (await auth.authenticate("coordenacao", "senha123")).token;
  const stockToken = (await auth.authenticate("estoque", "senha123")).token;
  return { app, coordToken: token, stockToken };
}

const TRANSFER_PAYLOAD = {
  externalReference: "BAZ-2024-0001",
  receivedAt: "2024-02-01",
  operationKey: OP_KEY,
  lines: [{ itemId: ITEM_ID, informedQuantity: 10, receivedQuantity: 8, acceptedQuantity: 8, rejectedQuantity: 0 }],
};

describe("bazar routes", () => {
  it("POST /inventory/bazar-transfers new reference returns 201", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/bazar-transfers",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: TRANSFER_PAYLOAD,
    });
    expect(response.statusCode).toBe(201);
  });

  it("POST /inventory/bazar-transfers duplicate reference returns 200", async () => {
    const { app, coordToken } = await buildApp({
      register: { execute: async () => ({ transferId: OPERATOR_ID, receiptId: OPERATOR_ID, duplicate: true }) },
    });
    const response = await app.inject({
      method: "POST",
      url: "/inventory/bazar-transfers",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: TRANSFER_PAYLOAD,
    });
    expect(response.statusCode).toBe(200);
  });

  it("POST /inventory/bazar-transfers without informedQuantity returns 400", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/bazar-transfers",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        externalReference: "BAZ-1",
        receivedAt: "2024-02-01",
        operationKey: OP_KEY,
        lines: [{ itemId: ITEM_ID, receivedQuantity: 8, acceptedQuantity: 8, rejectedQuantity: 0 }],
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("GET /inventory/bazar-transfers/:id unknown returns 404", async () => {
    const { app, coordToken } = await buildApp({
      get: { execute: async () => { throw new BazarTransferNotFoundError(OPERATOR_ID); } },
    });
    const response = await app.inject({
      method: "GET",
      url: `/inventory/bazar-transfers/${OPERATOR_ID}`,
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it("STOCK_DISTRIBUTION registering returns 403", async () => {
    const { app, stockToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/bazar-transfers",
      headers: { authorization: `Bearer ${stockToken}` },
      payload: TRANSFER_PAYLOAD,
    });
    expect(response.statusCode).toBe(403);
  });
});
