import bcrypt from "bcrypt";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { JwtAuthGateway } from "../../../../shared/infrastructure/gateways/jwt-auth.gateway.js";
import { makeAuthenticateMiddleware } from "../../../../shared/presentation/middleware/authenticate.middleware.js";
import { registerFamilyRoutes } from "../routes/families.routes.js";
import type { CreateFamilyUseCase } from "../../application/use-cases/create-family/create-family.use-case.js";
import type { GetFamilyUseCase } from "../../application/use-cases/get-family/get-family.use-case.js";
import type { CorrectFamilyUseCase } from "../../application/use-cases/correct-family/correct-family.use-case.js";
import type { SearchFamiliesUseCase } from "../../application/use-cases/search-families/search-families.use-case.js";
import type { AddFamilyMemberUseCase } from "../../application/use-cases/add-family-member/add-family-member.use-case.js";
import type { EndFamilyMembershipUseCase } from "../../application/use-cases/end-family-membership/end-family-membership.use-case.js";

class StubCreate {
  async execute(): Promise<{ familyId: string; code: string; revision: number }> {
    return { familyId: "11111111-1111-1111-1111-111111111111", code: "FAM000001", revision: 1 };
  }
}

class StubGet {
  async execute(): Promise<unknown> {
    return { familyId: "11111111-1111-1111-1111-111111111111", code: "FAM000001", members: [], memberCount: 0 };
  }
}

class StubCorrect {
  async execute(): Promise<unknown> {
    return { familyId: "11111111-1111-1111-1111-111111111111", revision: 2 };
  }
}

class StubSearch {
  async execute(): Promise<{ items: unknown[]; page: number; pageSize: number; total: number }> {
    return { items: [], page: 1, pageSize: 20, total: 0 };
  }
}

class StubAddMember {
  async execute(): Promise<unknown> {
    return { membershipId: "33333333-3333-3333-3333-333333333333", validFrom: "2024-01-01" };
  }
}

class StubEndMembership {
  async execute(): Promise<unknown> {
    return { membershipId: "33333333-3333-3333-3333-333333333333", validUntil: "2024-12-31" };
  }
}

const OPERATOR_ID = "11111111-1111-1111-1111-111111111111";

async function buildApp() {
  const passwordHash = await bcrypt.hash("senha123", 4);
  const auth = new JwtAuthGateway([
    { accountId: OPERATOR_ID, login: "coordenacao", password: "senha123", passwordHash, name: "Coordenacao", role: "COORDINATION" },
    { accountId: "22222222-2222-2222-2222-222222222222", login: "estoque", password: "senha123", passwordHash, name: "Estoque", role: "STOCK_DISTRIBUTION" },
  ]);
  const app = Fastify();
  const authenticate = makeAuthenticateMiddleware(auth);
  app.addHook("onRequest", async (request, reply) => {
    await authenticate(request, reply);
  });
  await registerFamilyRoutes(app, {
    create: new StubCreate() as unknown as CreateFamilyUseCase,
    get: new StubGet() as unknown as GetFamilyUseCase,
    correct: new StubCorrect() as unknown as CorrectFamilyUseCase,
    search: new StubSearch() as unknown as SearchFamiliesUseCase,
    addMember: new StubAddMember() as unknown as AddFamilyMemberUseCase,
    endMembership: new StubEndMembership() as unknown as EndFamilyMembershipUseCase,
  });
  const coordination = (await auth.authenticate("coordenacao", "senha123")).token;
  const stock = (await auth.authenticate("estoque", "senha123")).token;
  return { app, coordination, stock };
}

describe("family routes", () => {
  it("POST /families without token returns 401", async () => {
    const { app } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/families",
      payload: { referenceName: "Familia Teste", locationType: "URBAN" },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("POST /families with valid body returns 201", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/families",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { referenceName: "Familia Teste", locationType: "URBAN" },
    });
    expect(response.statusCode).toBe(201);
    await app.close();
  });

  it("POST /families with STOCK_DISTRIBUTION returns 403", async () => {
    const { app, stock } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/families",
      headers: { authorization: `Bearer ${stock}` },
      payload: { referenceName: "Familia Teste", locationType: "URBAN" },
    });
    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("POST /families with invalid payload returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/families",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { referenceName: "Familia Teste" },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("GET /families without token returns 401", async () => {
    const { app } = await buildApp();
    const response = await app.inject({ method: "GET", url: "/families" });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("GET /families with STOCK_DISTRIBUTION returns 200", async () => {
    const { app, stock } = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/families",
      headers: { authorization: `Bearer ${stock}` },
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("GET /families/:id returns 200", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/families/11111111-1111-1111-1111-111111111111",
      headers: { authorization: `Bearer ${coordination}` },
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("PATCH /families/:id with invalid revision returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "PATCH",
      url: "/families/11111111-1111-1111-1111-111111111111",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { reason: "ab", expectedRevision: 0 },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("POST /families/:id/members with valid body returns 201", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/families/11111111-1111-1111-1111-111111111111/members",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { personId: "22222222-2222-2222-2222-222222222222", validFrom: "2024-01-01", isReference: false },
    });
    expect(response.statusCode).toBe(201);
    await app.close();
  });

  it("POST /memberships/:id/closure with valid body returns 200", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/memberships/33333333-3333-3333-3333-333333333333/closure",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { validUntil: "2024-12-31", reason: "Motivo valido", expectedRevision: 1 },
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("POST /families/:id/members with invalid date returns 400", async () => {
    const { app, coordination } = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/families/11111111-1111-1111-1111-111111111111/members",
      headers: { authorization: `Bearer ${coordination}` },
      payload: { personId: "22222222-2222-2222-2222-222222222222", validFrom: "01/01/2024", isReference: false },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
