import type { FastifyReply, FastifyRequest } from "fastify";
import type { OperatorRole } from "../../domain/gateways/auth.gateway.js";

export function authorize(roles: OperatorRole[]) {
  return async function authorizeMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const role = request.operator?.role;
    if (!role || !roles.includes(role)) {
      await reply.status(403).send({ code: "FORBIDDEN", message: "Acesso nao autorizado" });
    }
  };
}
