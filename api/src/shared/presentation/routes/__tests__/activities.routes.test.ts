import bcrypt from "bcrypt";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { ActivityGateway } from "../../../domain/gateways/activity.gateway.js";
import { JwtAuthGateway } from "../../../infrastructure/gateways/jwt-auth.gateway.js";
import { makeAuthenticateMiddleware } from "../../middleware/authenticate.middleware.js";
import { registerActivityRoutes } from "../activities.routes.js";

const OPERATOR_ID = "11111111-1111-1111-1111-111111111111";

const gateway: ActivityGateway = {
  async requireOneOffActivity(activityId: string) {
    return {
      activityId,
      isActive: true,
      name: "Visita domiciliar",
      nature: "ONE_OFF",
      revision: 1,
      serviceType: { code: "HOME_VISIT", name: "Visita domiciliar", serviceTypeId: "st-visit" },
    };
  },
  async listActiveOneOffActivities() {
    return [await this.requireOneOffActivity("act-visit")];
  },
};

async function buildApp() {
  const passwordHash = await bcrypt.hash("senha123", 4);
  const auth = new JwtAuthGateway([
    { accountId: OPERATOR_ID, login: "coordenacao", password: "senha123", passwordHash, name: "Coordenacao", role: "COORDINATION" },
  ]);
  const app = Fastify();
  const authenticate = makeAuthenticateMiddleware(auth);
  app.addHook("onRequest", async (request, reply) => {
    await authenticate(request, reply);
  });
  await registerActivityRoutes(app, gateway);
  const token = (await auth.authenticate("coordenacao", "senha123")).token;
  return { app, token };
}

describe("activities routes", () => {
  it("GET /activities?nature=ONE_OFF returns active activities", async () => {
    const { app, token } = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/activities?nature=ONE_OFF",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { activities: { activityId: string }[] } };
    expect(body.data.activities).toHaveLength(1);
    expect(body.data.activities[0]?.activityId).toBe("act-visit");
  });

  it("GET /activities rejects unknown nature", async () => {
    const { app, token } = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/activities?nature=PERIODIC",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(400);
  });
});
