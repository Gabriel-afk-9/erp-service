import bcrypt from "bcrypt";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { makeAuthenticateMiddleware } from "../../../../shared/presentation/middleware/authenticate.middleware.js";
import { JwtAuthGateway } from "../../../../shared/infrastructure/gateways/jwt-auth.gateway.js";
import { CancelServiceRecordUseCase } from "../../application/use-cases/cancel-service-record/cancel-service-record.use-case.js";
import { CorrectServiceRecordNoteUseCase } from "../../application/use-cases/correct-service-record-note/correct-service-record-note.use-case.js";
import { GetServiceRecordUseCase } from "../../application/use-cases/get-service-record/get-service-record.use-case.js";
import { ListServiceRecordsByFamilyUseCase } from "../../application/use-cases/list-service-records-by-family/list-service-records-by-family.use-case.js";
import { RegisterServiceRecordUseCase } from "../../application/use-cases/register-service-record/register-service-record.use-case.js";
import {
  FakeServiceRecordRepository,
  StubActivityGateway,
  StubRegistryGateway,
  stubActivity,
  stubFamily,
  stubMembership,
} from "../../application/__tests__/fakes.js";
import { registerServiceRecordRoutes } from "../routes/service-record.routes.js";

const FAMILY_ID = "22222222-2222-2222-2222-222222222222";
const PERSON_ID = "33333333-3333-3333-3333-333333333333";
const ACTIVITY_ID = "44444444-4444-4444-4444-444444444444";
const PERIODIC_ACTIVITY_ID = "55555555-5555-5555-5555-555555555555";
const HOME_VISIT_ACTIVITY_ID = "99999999-9999-9999-9999-999999999999";
const DONATION_ACTIVITY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OPERATOR_ID = "11111111-1111-1111-1111-111111111111";

async function buildTestApp() {
  const passwordHash = await bcrypt.hash("senha123", 4);
  const auth = new JwtAuthGateway([
    { accountId: OPERATOR_ID, login: "coordenacao", password: "senha123", passwordHash, name: "Coordenacao", role: "COORDINATION" },
    { accountId: "66666666-6666-6666-6666-666666666666", login: "estoque", password: "senha123", passwordHash, name: "Estoque", role: "STOCK_DISTRIBUTION" },
    { accountId: "77777777-7777-7777-7777-777777777777", login: "gestor", password: "senha123", passwordHash, name: "Gestor", role: "ACTIVITY_MANAGER" },
  ]);
  const repository = new FakeServiceRecordRepository();
  const registry = new StubRegistryGateway(
    [{ ...stubFamily(), familyId: FAMILY_ID }],
    [{ ...stubMembership(), familyId: FAMILY_ID, personId: PERSON_ID }],
  );
  const activity = new StubActivityGateway([
    { ...stubActivity(), activityId: ACTIVITY_ID },
    { ...stubActivity({ activityId: PERIODIC_ACTIVITY_ID }), nature: "PERIODIC" },
    {
      ...stubActivity({ activityId: HOME_VISIT_ACTIVITY_ID }),
      serviceType: { serviceTypeId: "st-visit", code: "HOME_VISIT", name: "Visita domiciliar" },
    },
    {
      ...stubActivity({ activityId: DONATION_ACTIVITY_ID }),
      serviceType: { serviceTypeId: "st-donation", code: "ITEM_DONATION", name: "Doacao de itens" },
    },
  ]);

  const app = Fastify();
  const authenticate = makeAuthenticateMiddleware(auth);
  app.addHook("onRequest", async (request, reply) => {
    await authenticate(request, reply);
  });
  await registerServiceRecordRoutes(app, {
    register: new RegisterServiceRecordUseCase(repository, registry, activity),
    cancel: new CancelServiceRecordUseCase(repository),
    correctNote: new CorrectServiceRecordNoteUseCase(repository),
    get: new GetServiceRecordUseCase(repository),
    listByFamily: new ListServiceRecordsByFamilyUseCase(repository),
  });
  const coordination = (await auth.authenticate("coordenacao", "senha123")).token;
  const manager = (await auth.authenticate("gestor", "senha123")).token;
  return { app, coordination, manager };
}

const validBody = {
  activityId: ACTIVITY_ID,
  familyId: FAMILY_ID,
  personId: PERSON_ID,
  occurredAt: "2024-02-01",
  executorName: "Maria Silva",
  executorRole: "Assistente social",
  note: "Atendimento de rotina",
  homeVisit: null,
};

describe("service-record routes", () => {
  it("POST /service-records with a valid body returns 201", async () => {
    const { app, coordination } = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: validBody,
    });
    expect(response.statusCode).toBe(201);
    await app.close();
  });

  it("POST /service-records without token returns 401", async () => {
    const { app } = await buildTestApp();
    const response = await app.inject({ method: "POST", url: "/service-records", payload: validBody });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("POST /service-records with ACTIVITY_MANAGER returns 403", async () => {
    const { app, manager } = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${manager}` },
      payload: validBody,
    });
    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("POST /service-records with a malformed occurredAt returns 400", async () => {
    const { app, coordination } = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { ...validBody, occurredAt: "01/02/2024" },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("POST /service-records with a periodic activity returns 422", async () => {
    const { app, coordination } = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { ...validBody, activityId: PERIODIC_ACTIVITY_ID },
    });
    expect(response.statusCode).toBe(422);
    await app.close();
  });

  it("POST /service-records with an item donation activity returns 422", async () => {
    const { app, coordination } = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { ...validBody, activityId: DONATION_ACTIVITY_ID },
    });
    expect(response.statusCode).toBe(422);
    expect((response.json() as { code: string }).code).toBe("DONATION_TYPE_NOT_ALLOWED");
    await app.close();
  });

  it("PATCH /service-records/:id/cancel with a stale revision returns 409", async () => {
    const { app, coordination } = await buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: validBody,
    });
    const id = (created.json() as { data: { serviceRecordId: string } }).data.serviceRecordId;
    const response = await app.inject({
      method: "PATCH",
      url: `/service-records/${id}/cancel`,
      headers: { authorization: `Bearer ${coordination}` },
      payload: { reason: "Motivo valido", expectedRevision: 99 },
    });
    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it("PATCH /service-records/:id/cancel for an unknown id returns 404", async () => {
    const { app, coordination } = await buildTestApp();
    const response = await app.inject({
      method: "PATCH",
      url: "/service-records/88888888-8888-8888-8888-888888888888/cancel",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { reason: "Motivo valido", expectedRevision: 1 },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("GET /service-records/:id without token returns 401", async () => {
    const { app } = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/service-records/88888888-8888-8888-8888-888888888888",
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("GET /service-records?familyId returns the list", async () => {
    const { app, coordination } = await buildTestApp();
    await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: validBody,
    });
    const response = await app.inject({
      method: "GET",
      url: `/service-records?familyId=${FAMILY_ID}`,
      headers: { authorization: `Bearer ${coordination}` },
    });
    expect(response.statusCode).toBe(200);
    expect((response.json() as { data: { records: unknown[] } }).data.records).toHaveLength(1);
    await app.close();
  });

  it("GET /service-records/:id returns homeVisit.observedSituation for a home visit", async () => {
    const { app, coordination } = await buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: {
        ...validBody,
        activityId: HOME_VISIT_ACTIVITY_ID,
        homeVisit: { observedSituation: "Casa em boas condicoes" },
      },
    });
    expect(created.statusCode).toBe(201);
    const id = (created.json() as { data: { serviceRecordId: string } }).data.serviceRecordId;
    const response = await app.inject({
      method: "GET",
      url: `/service-records/${id}`,
      headers: { authorization: `Bearer ${coordination}` },
    });
    expect(response.statusCode).toBe(200);
    const data = (response.json() as { data: { homeVisit: { observedSituation: string } | null } }).data;
    expect(data.homeVisit).not.toBeNull();
    expect(data.homeVisit?.observedSituation).toBe("Casa em boas condicoes");
    await app.close();
  });

  it("GET /service-records/:id returns homeVisit null without a home visit", async () => {
    const { app, coordination } = await buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: validBody,
    });
    const id = (created.json() as { data: { serviceRecordId: string } }).data.serviceRecordId;
    const response = await app.inject({
      method: "GET",
      url: `/service-records/${id}`,
      headers: { authorization: `Bearer ${coordination}` },
    });
    expect(response.statusCode).toBe(200);
    expect((response.json() as { data: { homeVisit: unknown } }).data.homeVisit).toBeNull();
    await app.close();
  });

  it("GET /service-records?familyId maps items with and without home visits", async () => {
    const { app, coordination } = await buildTestApp();
    await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: validBody,
    });
    await app.inject({
      method: "POST",
      url: "/service-records",
      headers: { authorization: `Bearer ${coordination}` },
      payload: {
        ...validBody,
        activityId: HOME_VISIT_ACTIVITY_ID,
        homeVisit: { observedSituation: "Situacao encontrada na visita" },
      },
    });
    const response = await app.inject({
      method: "GET",
      url: `/service-records?familyId=${FAMILY_ID}`,
      headers: { authorization: `Bearer ${coordination}` },
    });
    expect(response.statusCode).toBe(200);
    const records = (
      response.json() as {
        data: { records: { hasHomeVisit: boolean; homeVisit: { observedSituation: string } | null }[] };
      }
    ).data.records;
    expect(records).toHaveLength(2);
    const withVisit = records.find((r) => r.hasHomeVisit);
    const withoutVisit = records.find((r) => !r.hasHomeVisit);
    expect(withVisit?.homeVisit?.observedSituation).toBe("Situacao encontrada na visita");
    expect(withoutVisit?.homeVisit).toBeNull();
    await app.close();
  });
});
