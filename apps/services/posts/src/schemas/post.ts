import { z } from "zod";

const HASHTAG_REGEX = /#[a-zA-Z0-9_]+/g;
const MAX_CONTENT_LENGTH = 280;

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(
      MAX_CONTENT_LENGTH,
      `Content must be ${MAX_CONTENT_LENGTH} characters or less`,
    ),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
});

export const updateModerationStatusSchema = z.object({
  postId: z.string().uuid(),
  status: z.enum(["active", "flagged", "hidden", "suspended"]),
});

export const getPostByIdSchema = z.object({
  postId: z.string().uuid(),
});

export const getPostsByUserIdSchema = z.object({
  userId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

export const getRecentPostsSchema = z.object({
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
});

export const deletePostSchema = z.object({
  postId: z.string().uuid(),
});

export const postResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string(),
  hashtags: z.array(z.string()),
  mediaUrl: z.string().nullable(),
  mediaType: z.enum(["image", "video"]).nullable(),
  moderationStatus: z.enum(["active", "flagged", "hidden", "suspended"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const postsResponseSchema = z.object({
  meta: z.object({
    cursor: z.string().uuid().nullable(),
    hasNextPage: z.boolean(),
  }),
  data: z.array(postResponseSchema),
});

export function extractHashtags(content: string): string[] {
  const matches = content.match(HASHTAG_REGEX);
  if (!matches) return [];

  return [...new Set(matches.map((tag) => tag.toLowerCase()))];
}

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdateModerationStatusInput = z.infer<
  typeof updateModerationStatusSchema
>;
export type GetPostByIdInput = z.infer<typeof getPostByIdSchema>;
export type GetPostsByUserIdInput = z.infer<typeof getPostsByUserIdSchema>;
export type GetRecentPostsInput = z.infer<typeof getRecentPostsSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
