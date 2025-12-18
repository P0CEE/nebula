import { trpcServer } from "@hono/trpc-server";
import { tasks } from "@trigger.dev/sdk";
import { createTRPCContext } from "./trpc/init";
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/router";
import { uploadToR2 } from "./utils/r2";
import { getExtension, validateFile } from "./utils/validation";

const app = new Hono();

app.use("/*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
  }),
);

app.post("/upload", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { verifyAccessToken } = await import("./utils/auth.js");
  const session = await verifyAccessToken(token);

  if (!session) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const userId = session.user.id;

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  const validation = validateFile(file);

  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  const ext = getExtension(file.name);
  const fileId = randomUUID();
  const key = `${userId}/${fileId}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const cdnUrl = await uploadToR2(key, buffer, file.type);

  // Trigger async optimization for images (not GIFs)
  if (validation.mediaType === "image" && !validation.isGif) {
    try {
      await tasks.trigger("optimize-image", {
        key,
        contentType: file.type,
      });
    } catch (err) {
      console.error("Failed to trigger optimization job:", err);
    }
  }

  return c.json({
    url: cdnUrl,
    mediaType: validation.mediaType,
    key,
  });
});

app.get("/health", (c) => c.json({ status: "ok" }));

export default {
  port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3017,
  fetch: app.fetch,
};
