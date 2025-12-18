import { z } from "zod";
import { withTRPCRateLimit } from "../../../middleware/rate-limit";
import { getServiceClients } from "../../../services/clients";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const mediaProxyRouter = createTRPCRouter({
  delete: protectedProcedure
    .input(z.object({ key: z.string() }))
    .use(withTRPCRateLimit("media.delete"))
    .mutation(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.media.delete.mutate(input);
    }),
});
