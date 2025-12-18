import {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByUsername,
} from "@nebula/db/queries";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "./init";
import {
  getUserByUsernameSchema,
  loginSchema,
  registerSchema,
} from "../schemas/auth";
import { generateToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";

export const appRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      const existingUser = await getUserByEmail(ctx.db, input.email);
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      const hashedPassword = await hashPassword(input.password);

      const user = await createUser(ctx.db, {
        email: input.email,
        password: hashedPassword,
        username: input.username,
        fullName: input.fullName,
      });

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      const accessToken = await generateToken(
        user.id,
        user.email,
        user.fullName || undefined,
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        accessToken,
      };
    }),

  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const user = await getUserByEmail(ctx.db, input.email);

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
    }

    const validPassword = await verifyPassword(input.password, user.password);

    if (!validPassword) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
    }

    const accessToken = await generateToken(
      user.id,
      user.email,
      user.fullName || undefined,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      accessToken,
    };
  }),

  logout: protectedProcedure.mutation(async () => {
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.db, ctx.userId);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  getByUsername: publicProcedure
    .input(getUserByUsernameSchema)
    .query(async ({ ctx, input }) => {
      const user = await getUserByUsername(ctx.db, input.username);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),
});

export type AppRouter = typeof appRouter;
