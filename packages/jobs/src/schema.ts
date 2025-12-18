import { z } from "zod";

export const onboardUserSchema = z.object({
  userId: z.string().uuid(),
});

export type OnboardUserPayload = z.infer<typeof onboardUserSchema>;
