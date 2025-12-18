import { createClient, type RedisClientType } from "redis";

export class RedisCache {
  private redis: RedisClientType | null = null;
  private prefix: string;
  private defaultTTL: number;

  constructor(prefix: string, defaultTTL: number = 30 * 60) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
  }

  private async getRedisClient(): Promise<RedisClientType> {
    if (this.redis?.isOpen) {
      return this.redis;
    }

    // Create new connection with your proven solution
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is required");
    }

    const isFlyIo = !!process.env.FLY_APP_NAME;

    this.redis = createClient({
      url: redisUrl,
      pingInterval: 4 * 60 * 1000,
      socket: {
        family: isFlyIo ? 6 : 4,
        connectTimeout: 10000,
      },
    });

    // Event listeners from your proven solution
    this.redis.on("error", (err) => {
      console.error(`Redis error for ${this.prefix} cache:`, err);
    });

    await this.redis.connect();
    return this.redis;
  }

  private parseValue<T>(value: string | null): T | undefined {
    if (!value) return undefined;

    try {
      return JSON.parse(value) as T;
    } catch {
      // If parsing fails, return the raw string (for backwards compatibility)
      return value as unknown as T;
    }
  }

  private stringifyValue(value: any): string {
    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value);
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const redis = await this.getRedisClient();
      const value = await redis.get(this.getKey(key));
      return this.parseValue<T>(value);
    } catch (error) {
      console.error(
        `Redis get error for ${this.prefix} cache, key "${key}":`,
        error,
      );
      // Reset connection on error to force reconnection next time
      this.redis = null;
      return undefined;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const redis = await this.getRedisClient();
      const serializedValue = this.stringifyValue(value);
      const redisKey = this.getKey(key);
      const ttl = ttlSeconds ?? this.defaultTTL;

      await redis.set(redisKey, serializedValue);
      if (ttl > 0) {
        await redis.expire(redisKey, ttl);
      }
    } catch (error) {
      console.error(
        `Redis set error for ${this.prefix} cache, key "${key}":`,
        error,
      );
      // Reset connection on error
      this.redis = null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const redis = await this.getRedisClient();
      await redis.del(this.getKey(key));
    } catch (error) {
      console.error(
        `Redis delete error for ${this.prefix} cache, key "${key}":`,
        error,
      );
      // Reset connection on error
      this.redis = null;
    }
  }

  async healthCheck(): Promise<void> {
    try {
      const redis = await this.getRedisClient();
      await redis.ping();
    } catch (error) {
      // Reset connection state on health check failure
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }
      throw new Error(`Redis health check failed: ${error}`);
    }
  }

  async incr(key: string): Promise<number> {
    try {
      const redis = await this.getRedisClient();
      return await redis.incr(this.getKey(key));
    } catch (error) {
      console.error(
        `Redis incr error for ${this.prefix} cache, key "${key}":`,
        error,
      );
      this.redis = null;
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      const redis = await this.getRedisClient();
      await redis.expire(this.getKey(key), seconds);
    } catch (error) {
      console.error(
        `Redis expire error for ${this.prefix} cache, key "${key}":`,
        error,
      );
      this.redis = null;
    }
  }

  async zAdd(
    key: string,
    members: Array<{ score: number; value: string }>,
  ): Promise<void> {
    try {
      const redis = await this.getRedisClient();
      const redisKey = this.getKey(key);

      if (members.length === 0) return;

      await redis.zAdd(redisKey, members);
    } catch (error) {
      console.error(
        `Redis zAdd error for ${this.prefix} cache, key "${key}":`,
        error,
      );
      this.redis = null;
    }
  }

  async zRangeByScore(
    key: string,
    min: string | number,
    max: string | number,
    options?: { LIMIT?: { offset: number; count: number } },
  ): Promise<string[]> {
    try {
      const redis = await this.getRedisClient();
      const redisKey = this.getKey(key);

      return await redis.zRangeByScore(redisKey, min, max, options);
    } catch (error) {
      console.error(
        `Redis zRangeByScore error for ${this.prefix} cache, key "${key}":`,
        error,
      );
      this.redis = null;
      return [];
    }
  }

  async zRevRangeByScore(
    key: string,
    max: string | number,
    min: string | number,
    options?: { LIMIT?: { offset: number; count: number } },
  ): Promise<string[]> {
    try {
      const redis = await this.getRedisClient();
      const redisKey = this.getKey(key);

      return await redis.zRange(redisKey, min, max, {
        BY: "SCORE",
        REV: true,
        LIMIT: options?.LIMIT,
      });
    } catch (error) {
      console.error(
        `Redis zRevRangeByScore error for ${this.prefix} cache, key "${key}":`,
        error,
      );
      this.redis = null;
      return [];
    }
  }

  async zRem(key: string, members: string[]): Promise<void> {
    try {
      const redis = await this.getRedisClient();
      const redisKey = this.getKey(key);

      if (members.length === 0) return;

      await redis.zRem(redisKey, members);
    } catch (error) {
      console.error(
        `Redis zRem error for ${this.prefix} cache, key "${key}":`,
        error,
      );
      this.redis = null;
    }
  }
}
