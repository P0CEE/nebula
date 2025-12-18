import { z } from "zod";

export const followUserSchema = z.object({
  userId: z.string().uuid(),
});

export const unfollowUserSchema = z.object({
  userId: z.string().uuid(),
});

export const isFollowingSchema = z.object({
  userId: z.string().uuid(),
});

export const getFollowersSchema = z.object({
  userId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

export const getFollowingSchema = z.object({
  userId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

export const getFollowStatsSchema = z.object({
  userId: z.string().uuid(),
});

export type FollowUserInput = z.infer<typeof followUserSchema>;
export type UnfollowUserInput = z.infer<typeof unfollowUserSchema>;
export type IsFollowingInput = z.infer<typeof isFollowingSchema>;
export type GetFollowersInput = z.infer<typeof getFollowersSchema>;
export type GetFollowingInput = z.infer<typeof getFollowingSchema>;
export type GetFollowStatsInput = z.infer<typeof getFollowStatsSchema>;
