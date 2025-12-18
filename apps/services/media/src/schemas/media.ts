import { z } from "zod";

export const uploadResponseSchema = z.object({
  url: z.string().url(),
  mediaType: z.enum(["image", "video"]),
  key: z.string(),
});

export const deleteMediaSchema = z.object({
  key: z.string().min(1),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>;
