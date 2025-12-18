import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const isDevelopment = process.env.NODE_ENV === "development";

const connectionConfig = {
  max: isDevelopment ? 8 : 12,
  idleTimeoutMillis: isDevelopment ? 5000 : 60000,
  connectionTimeoutMillis: 15000,
  maxUses: isDevelopment ? 100 : 0,
  allowExitOnIdle: true,
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString,
  ...connectionConfig,
});

export const getConnectionPoolStats = () => {
  const getPoolStats = (pool: Pool, name: string) => {
    try {
      return {
        name,
        idle: pool.idleCount || 0,
        active: pool.totalCount - pool.idleCount,
        waiting: pool.waitingCount || 0,
      };
    } catch (error) {
      return {
        name,
        error: error instanceof Error ? error.message : String(error),
        total: 0,
        idle: 0,
        active: 0,
        waiting: 0,
        ended: true,
      };
    }
  };

  const poolStats = getPoolStats(pool, "primary");

  return {
    timestamp: new Date().toISOString(),
    pools: {
      primary: poolStats,
    },
    summary: {
      totalConnections: connectionConfig.max,
      totalActive: poolStats.active,
      totalWaiting: poolStats.waiting,
      hasExhaustedPools:
        poolStats.active >= connectionConfig.max || poolStats.waiting > 0,
      utilizationPercent: Math.round(
        (poolStats.active / connectionConfig.max) * 100,
      ),
    },
  };
};

export const db = drizzle(pool, {
  schema,
  casing: "snake_case",
});

export const connectDb = async () => {
  return db;
};

export type Database = typeof db;
