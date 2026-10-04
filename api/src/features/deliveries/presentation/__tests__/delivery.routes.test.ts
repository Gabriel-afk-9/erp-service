import bcrypt from "bcrypt";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { DeliveryNotFoundError } from "../../domain/errors/delivery-not-found.error.js";
import { EligibilityJustificationRequiredError } from "../../domain/errors/eligibility-justification-required.error.js";
import { InsufficientBalanceError } from "../../domain/errors/insufficient-balance.error.js";
import { JwtAuthGateway } from "../../../../shared/infrastructure/gateways/jwt-auth.gateway.js";
import { makeAuthenticateMiddleware } from "../../../../shared/presentation/middleware/authenticate.middleware.js";
import { registerDeliveryRoutes } from "../routes/delivery.routes.js";

const OPERATOR_ID = "11111111-1111-1111-1111-111111111111";
const LOT_ID = "22222222-2222-2222-2222-222222222222";
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
  await registerDeliveryRoutes(app, {
    confirm: (overrides.confirm ?? stub({ deliveryId: OPERATOR_ID, serviceRecordId: OPERATOR_ID, duplicate: false })) as never,
    reverse: (overrides.reverse ?? stub({ reversalId: OPERATOR_ID, duplicate: false })) as never,
    preview: (overrides.preview ?? stub({ familyId: "fam-1", eligibilityStatus: "PENDING", justificationRequired: true, previousDeliveries: [] })) as never,
    get: (overrides.get ?? stub({ deliveryId: OPERATOR_ID, lines: [] })) as never,
    list: (overrides.list ?? stub({ deliveries: [] })) as never,
  });
  const token = (await auth.authenticate("coordenacao", "senha123")).token;
  const stockToken = (await auth.authenticate("estoque", "senha123")).token;
  return { app, coordToken: token, stockToken };
}

const DELIVERY_PAYLOAD = {
  familyId: "fam-1",
  occurredAt: "2024-03-01",
  lines: [{ lotId: LOT_ID, quantity: 2 }],
  executorName: "Joana",
  executorRole: "Assistente",
  exceptionReason: "Familia vulneravel",
  authorizedBy: "Coordenacao",
  operationKey: OP_KEY,
};

describe("delivery routes", () => {
  it("POST /deliveries valid returns 201", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/deliveries",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: DELIVERY_PAYLOAD,
    });
    expect(response.statusCode).toBe(201);
  });

  it("POST /deliveries without justification stubbed to require returns 422", async () => {
    const { app, coordToken } = await buildApp({
      confirm: { execute: async () => { throw new EligibilityJustificationRequiredError("PENDING"); } },
    });
    const response = await app.inject({
      method: "POST",
      url: "/deliveries",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { ...DELIVERY_PAYLOAD, exceptionReason: undefined, authorizedBy: undefined },
    });
    expect(response.statusCode).toBe(422);
  });

  it("POST /deliveries with insufficient balance returns 422", async () => {
    const { app, coordToken } = await buildApp({
      confirm: { execute: async () => { throw new InsufficientBalanceError("Arroz 1kg", 1, 99); } },
    });
    const response = await app.inject({
      method: "POST",
      url: "/deliveries",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { ...DELIVERY_PAYLOAD, lines: [{ lotId: LOT_ID, quantity: 99 }] },
    });
    expect(response.statusCode).toBe(422);
  });

  it("STOCK_DISTRIBUTION confirming returns 403", async () => {
    const { app, stockToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/deliveries",
      headers: { authorization: `Bearer ${stockToken}` },
      payload: DELIVERY_PAYLOAD,
    });
    expect(response.statusCode).toBe(403);
  });

  it("GET /deliveries/preview is read-only and returns 200", async () => {
    const { app, coordToken } = await buildApp();
    for (let index = 0; index < 3; index += 1) {
      const response = await app.inject({
        method: "GET",
        url: "/deliveries/preview?familyId=fam-1&date=2024-03-01",
        headers: { authorization: `Bearer ${coordToken}` },
      });
      expect(response.statusCode).toBe(200);
    }
  });

  it("GET /deliveries/:id unknown returns 404", async () => {
    const { app, coordToken } = await buildApp({
      get: { execute: async () => { throw new DeliveryNotFoundError(OPERATOR_ID); } },
    });
    const response = await app.inject({
      method: "GET",
      url: `/deliveries/${OPERATOR_ID}`,
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it("POST /deliveries/:id/reversal returns 200", async () => {
    const { app, coordToken } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: `/deliveries/${OPERATOR_ID}/reversal`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { reason: "Lancamento em duplicidade" },
    });
    expect(response.statusCode).toBe(200);
  });
});
