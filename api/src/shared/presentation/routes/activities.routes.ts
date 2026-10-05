import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ActivityGateway } from "../../domain/gateways/activity.gateway.js";
import { authorize } from "../middleware/authorize.middleware.js";

export async function registerActivityRoutes(app: FastifyInstance, activityGateway: ActivityGateway): Promise<void> {
  app.get(
    "/activities",
    { preHandler: [authorize(["COORDINATION", "SOCIAL_WORKER", "STOCK_DISTRIBUTION"])] },
    async (request, reply) => {
      const query = z.object({ nature: z.enum(["ONE_OFF"]).optional() }).strict().safeParse(request.query);
      if (!query.success) {
        await reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid activities query" });
        return;
      }
      const activities = await activityGateway.listActiveOneOffActivities();
      await reply.status(200).send({ data: { activities } });
    },
  );
}
