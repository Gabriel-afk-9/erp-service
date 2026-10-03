import type { FastifyReply, FastifyRequest } from "fastify";
import { TokenExpiredError } from "../../domain/errors/token-expired.error.js";
import type { AuthGateway, AuthenticatedOperator } from "../../domain/gateways/auth.gateway.js";

declare module "fastify" {
  interface FastifyRequest {
    operator?: AuthenticatedOperator;
  }
}

export function makeAuthenticateMiddleware(authGateway: AuthGateway) {
  return async function authenticateMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      await reply.status(401).send({ code: "UNAUTHORIZED", message: "Token nao fornecido" });
      return;
    }
    const token = header.slice("Bearer ".length);
    try {
      request.operator = await authGateway.verify(token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await reply.status(401).send({ code: "TOKEN_EXPIRED", message: "Sessao expirada" });
        return;
      }
      await reply.status(401).send({ code: "UNAUTHORIZED", message: "Nao autenticado" });
    }
  };
}
