import { connectDb } from "@db/client";
import { sql } from "drizzle-orm";

export async function checkHealth() {
  const db = await connectDb();
  await db.execute(sql`SELECT 1`);
}
