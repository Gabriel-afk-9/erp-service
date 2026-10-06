import bcrypt from "bcrypt";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { JwtAuthGateway } from "../../../../shared/infrastructure/gateways/jwt-auth.gateway.js";
import { makeAuthenticateMiddleware } from "../../../../shared/presentation/middleware/authenticate.middleware.js";
import { registerPersonRoutes } from "../routes/persons.routes.js";
import type { RegisterPersonUseCase } from "../../application/use-cases/register-person/register-person.use-case.js";
import type { GetPersonUseCase } from "../../application/use-cases/get-person/get-person.use-case.js";
import type { CorrectPersonUseCase } from "../../application/use-cases/correct-person/correct-person.use-case.js";
import type { SearchPersonsUseCase } from "../../application/use-cases/search-persons/search-persons.use-case.js";

class StubRegister {
  async execute(): Promise<{ personId: string; membershipId: string }> {
    return {
      personId: "22222222-2222-2222-2222-222222222222",
      membershipId: "33333333-3333-3333-3333-333333333333",
    };
  }
}

class StubGet {
  async execute(): Promise<unknown> {
    return { personId: "22222222-2222-2222-2222-222222222222", name: "Ana Souza" };
  }
}

class StubCorrect {
  async execute(): Promise<unknown> {
    return { personId: "22222222-2222-2222-2222-222222222222", revision: 2 };
  }
}

class StubSearch {
  async execute(): Promise<{ items: unknown[]; page: number; pageSize: number; total: number }> {
    return { items: [], page: 1, pageSize: 20, total: 0 };
  }
}

const OPERATOR_ID = "11111111-1111-1111-1111-111111111111";
const FAMILY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PERSON_ID = "22222222-2222-2222-2222-222222222222";

async function buildApp() {
  const passwordHash = await bcrypt.hash("senha123", 4);
  const auth = new JwtAuthGateway([
    { accountId: OPERATOR_ID, login: "coordenacao", password: "senha123", passwordHash, name: "Coordenacao", role: "COORDINATION" },
    { accountId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", login: "estoque", password: "senha123", passwordHash, name: "Estoque", role: "STOCK_DISTRIBUTION" },
  ]);
  const app = Fastify();
  const authenticate = makeAuthenticateMiddleware(auth);
  app.addHook("onRequest", async (request, reply) => {
    await authenticate(request, reply);
  });
  await registerPersonRoutes(app, {
    register: new StubRegister() as unknown as RegisterPersonUseCase,
    get: new StubGet() as unknown as GetPersonUseCase,
    correct: new StubCorrect() as unknown as CorrectPersonUseCase,
    search: new StubSearch() as unknown as SearchPersonsUseCase,
  });
  const coordination = (await auth.authenticate("coordenacao", "senha123")).token;
  return { app, coordination };
}

describe("person routes validation", () => {
  it("POST /persons with valid body returns 201", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/persons",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { name: "Ana Souza", familyId: FAMILY_ID, validFrom: "2024-01-01", isReference: false },
    });
    expect(response.statusCode).toBe(201);
    await app.close();
  });

  it("POST /persons with short name returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/persons",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { name: "a", familyId: FAMILY_ID, validFrom: "2024-01-01", isReference: false },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("POST /persons with impossible date returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/persons",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { name: "Ana Souza", familyId: FAMILY_ID, validFrom: "2024-02-30", isReference: false },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("POST /persons with non-uuid familyId returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/persons",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { name: "Ana Souza", familyId: "x", validFrom: "2024-01-01", isReference: false },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("POST /persons with unknown key returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/persons",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { name: "Ana Souza", familyId: FAMILY_ID, validFrom: "2024-01-01", isReference: false, nickname: "Aninha" },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("POST /persons with blank reason on correction returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "PATCH",
      url: `/persons/${PERSON_ID}`,
      headers: { authorization: `Bearer ${coordination}` },
      payload: { name: "Ana Souza", reason: "   ", expectedRevision: 1 },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("GET /persons with oversized pageSize returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/persons?pageSize=1000",
      headers: { authorization: `Bearer ${coordination}` },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("GET /persons/:id with non-uuid returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/persons/not-a-uuid",
      headers: { authorization: `Bearer ${coordination}` },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
