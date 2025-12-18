import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { logger, schemaTask } from "@trigger.dev/sdk";
import sharp from "sharp";
import { z } from "zod";

const optimizeSchema = z.object({
  key: z.string(),
  contentType: z.string(),
});

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET || "nebula";

export const optimizeImage = schemaTask({
  id: "optimize-image",
  schema: optimizeSchema,
  maxDuration: 120,
  run: async ({ key, contentType }) => {
    logger.info(`Optimizing image: ${key}`);

    // Download original
    const getResult = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    const buffer = Buffer.from(await getResult.Body!.transformToByteArray());

    // Convert to WebP (optimized)
    const webpKey = key.replace(/\.[^.]+$/, ".webp");
    const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: webpKey,
        Body: webpBuffer,
        ContentType: "image/webp",
      }),
    );

    logger.info(`Created WebP: ${webpKey}`);

    // Generate thumbnail (400px width)
    const thumbKey = key.replace(/\.[^.]+$/, "_thumb.webp");
    const thumbBuffer = await sharp(buffer)
      .resize(400, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: "image/webp",
      }),
    );

    logger.info(`Created thumbnail: ${thumbKey}`);

    return { webpKey, thumbKey };
  },
});
