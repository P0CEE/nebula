import { z } from "zod";

export const getTimelineSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().min(1).max(50).default(20),
});
