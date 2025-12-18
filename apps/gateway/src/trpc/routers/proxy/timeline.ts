import { z } from "zod";
import { getServiceClients } from "../../../services/clients";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const timelineProxyRouter = createTRPCRouter({
  getTimeline: protectedProcedure
    .input(
      z
        .object({
          cursor: z.string().optional(),
          pageSize: z.number().min(1).max(50).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.timeline.getTimeline.query(input);
    }),
});
