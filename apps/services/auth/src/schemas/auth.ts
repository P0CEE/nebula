import { z } from "zod";

const RESERVED_USERNAMES = [
  "admin",
  "api",
  "auth",
  "login",
  "register",
  "logout",
  "settings",
  "profile",
  "user",
  "users",
  "post",
  "posts",
];

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    )
    .refine(
      (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
      "This username is reserved",
    ),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters")
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const getUserByUsernameSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GetUserByUsernameInput = z.infer<typeof getUserByUsernameSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
