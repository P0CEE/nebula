import type { Database } from "@nebula/db/client";
import { createJobDb } from "@nebula/db/job-client";
import { locals, tasks } from "@trigger.dev/sdk";

const DbLocal = locals.create<{
  db: Database;
  disconnect: () => Promise<void>;
}>("db");

export const getDb = () => {
  const dbObj = locals.get(DbLocal);
  if (!dbObj) throw new Error("DB not initialized in middleware");
  return dbObj.db;
};

tasks.middleware("db", async ({ next }) => {
  const { db, disconnect } = createJobDb();
  locals.set(DbLocal, { db, disconnect });

  try {
    await next();
  } finally {
    await disconnect();
  }
});
