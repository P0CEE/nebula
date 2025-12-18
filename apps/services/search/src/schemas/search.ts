import { z } from "zod";

export const searchQuerySchema = z.object({
  query: z.string().min(1).max(100),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(50).optional(),
});

export const searchHashtagSchema = z.object({
  hashtag: z.string().min(1).max(50),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(50).optional(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type SearchHashtagInput = z.infer<typeof searchHashtagSchema>;
