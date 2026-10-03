import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { InvalidCredentialsError } from "../../domain/errors/invalid-credentials.error.js";
import type { AuthGateway } from "../../domain/gateways/auth.gateway.js";

const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance, authGateway: AuthGateway): Promise<void> {
  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid login payload" });
      return;
    }
    try {
      const result = await authGateway.authenticate(parsed.data.login, parsed.data.password);
      await reply.status(200).send({ data: result });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        await reply.status(401).send({ code: "INVALID_CREDENTIALS", message: "Invalid login or password" });
        return;
      }
      throw error;
    }
  });

  app.get("/auth/me", async (request, reply) => {
    await reply.status(200).send({ data: { operator: request.operator } });
  });
}
