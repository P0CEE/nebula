import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "./init";
import { deleteMediaSchema } from "../schemas/media";
import { deleteFromR2 } from "../utils/r2";

export const appRouter = createTRPCRouter({
  delete: protectedProcedure
    .input(deleteMediaSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Verify ownership: key must start with userId
      if (!input.key.startsWith(`${userId}/`)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this media",
        });
      }

      await deleteFromR2(input.key);

      return { success: true };
    }),
});

export type AppRouter = typeof appRouter;
