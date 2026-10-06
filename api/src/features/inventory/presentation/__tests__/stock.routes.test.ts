import bcrypt from "bcrypt";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { NegativeBalanceBlockedError } from "../../domain/errors/negative-balance-blocked.error.js";
import { ReceiptNotFoundError } from "../../domain/errors/receipt-not-found.error.js";
import { ReceiptOperationConflictError } from "../../domain/errors/receipt-operation-conflict.error.js";
import { JwtAuthGateway } from "../../../../shared/infrastructure/gateways/jwt-auth.gateway.js";
import { makeAuthenticateMiddleware } from "../../../../shared/presentation/middleware/authenticate.middleware.js";
import { registerStockRoutes } from "../routes/stock.routes.js";

const OPERATOR_ID = "11111111-1111-1111-1111-111111111111";
const ITEM_ID = "22222222-2222-2222-2222-222222222222";
const OP_KEY = "33333333-3333-3333-3333-333333333333";

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
  await registerStockRoutes(app, {
    confirmReceipt: (overrides.confirmReceipt ?? stub({ receiptId: OPERATOR_ID, duplicate: false })) as never,
    getReceipt: (overrides.getReceipt ?? stub({ receiptId: OPERATOR_ID, lines: [] })) as never,
    listReceipts: (overrides.listReceipts ?? stub({ receipts: [] })) as never,
    getItemBalance: (overrides.getItemBalance ?? stub({ itemId: ITEM_ID, onHand: 9, available: 9, lots: [] })) as never,
    listItemsWithBalance: (overrides.listItemsWithBalance ?? stub({ items: [] })) as never,
    getItemMovements: (overrides.getItemMovements ?? stub({ itemId: ITEM_ID, movements: [] })) as never,
    adjustStock: (overrides.adjustStock ?? stub({ movementId: OPERATOR_ID, duplicate: false })) as never,
    createCount: (overrides.createCount ?? stub({ countId: OPERATOR_ID, lineCount: 0 })) as never,
    recordCountLine: (overrides.recordCountLine ?? stub({ lineId: OPERATOR_ID, variance: 0 })) as never,
    closeCount: (overrides.closeCount ?? stub({ countId: OPERATOR_ID, adjustments: 0 })) as never,
  });
  const token = (await auth.authenticate("coordenacao", "senha123")).token;
  const stockToken = (await auth.authenticate("estoque", "senha123")).token;
  return { app, coordToken: token, stockToken };
}

const RECEIPT_PAYLOAD = {
  originType: "PERSON",
  receivedAt: "2024-01-15",
  operationKey: OP_KEY,
  lines: [{ itemId: ITEM_ID, receivedQuantity: 9, acceptedQuantity: 9, rejectedQuantity: 0 }],
};

describe("stock routes", () => {
  it("POST /inventory/receipts valid returns 201", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/receipts",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: RECEIPT_PAYLOAD,
    });
    expect(response.statusCode).toBe(201);
  });

  it("POST /inventory/receipts without lines returns 400", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/receipts",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { originType: "PERSON", receivedAt: "2024-01-15", operationKey: OP_KEY, lines: [] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("POST /inventory/receipts with BAZAR origin returns 400", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/receipts",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { ...RECEIPT_PAYLOAD, originType: "BAZAR" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("POST /inventory/receipts conflicting key returns 409", async () => {
    const { app, coordToken } = await buildApp({
      confirmReceipt: { execute: async () => { throw new ReceiptOperationConflictError(OP_KEY); } },
    });
    const response = await app.inject({
      method: "POST",
      url: "/inventory/receipts",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: RECEIPT_PAYLOAD,
    });
    expect(response.statusCode).toBe(409);
  });

  it("GET /inventory/receipts/:id unknown returns 404", async () => {
    const { app, coordToken } = await buildApp({
      getReceipt: { execute: async () => { throw new ReceiptNotFoundError(OPERATOR_ID); } },
    });
    const response = await app.inject({
      method: "GET",
      url: `/inventory/receipts/${OPERATOR_ID}`,
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it("GET /inventory/items/:id/balance returns 200", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: `/inventory/items/${ITEM_ID}/balance`,
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(response.statusCode).toBe(200);
  });

  it("POST /inventory/adjustments beyond balance returns 422", async () => {
    const { app, coordToken } = await buildApp({
      adjustStock: { execute: async () => { throw new NegativeBalanceBlockedError(ITEM_ID, 9, 99); } },
    });
    const response = await app.inject({
      method: "POST",
      url: "/inventory/adjustments",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { itemId: ITEM_ID, quantity: 99, direction: "OUT", reason: "Perda", operationKey: OP_KEY },
    });
    expect(response.statusCode).toBe(422);
  });

  it("STOCK_DISTRIBUTION adjusting returns 403", async () => {
    const { app, stockToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/inventory/adjustments",
      headers: { authorization: `Bearer ${stockToken}` },
      payload: { itemId: ITEM_ID, quantity: 1, direction: "IN", reason: "Sobras", operationKey: OP_KEY },
    });
    expect(response.statusCode).toBe(403);
  });

  it("POST /inventory/counts/:id/closure returns 200", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: `/inventory/counts/${OPERATOR_ID}/closure`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {},
    });
    expect(response.statusCode).toBe(200);
  });
});
