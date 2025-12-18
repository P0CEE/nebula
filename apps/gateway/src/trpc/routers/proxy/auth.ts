import { z } from "zod";
import { getServiceClients } from "../../../services/clients";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../init";
import { deleteCookie, setCookie } from "hono/cookie";

export const authProxyRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        username: z.string().min(3).max(30),
        fullName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const clients = getServiceClients();
      const result = await clients.auth.register.mutate(input);

      setCookie(ctx.honoContext, "access_token", result.accessToken, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return result;
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const clients = getServiceClients();
      const result = await clients.auth.login.mutate(input);

      setCookie(ctx.honoContext, "access_token", result.accessToken, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return result;
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const clients = getServiceClients(ctx.session.user.id);
    deleteCookie(ctx.honoContext, "access_token");
    return clients.auth.logout.mutate();
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const clients = getServiceClients(ctx.session.user.id);
    return clients.auth.me.query();
  }),

  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const clients = getServiceClients();
      return clients.auth.getByUsername.query(input);
    }),
});
