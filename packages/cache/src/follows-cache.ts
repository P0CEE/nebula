import { RedisCache } from "./redis-client";

const followersCache = new RedisCache("follows:followers", 5 * 60);
const followingCache = new RedisCache("follows:following", 5 * 60);
const statsCache = new RedisCache("follows:stats", 10 * 60);
const isFollowingCache = new RedisCache("follows:is", 30 * 60);

const isDevelopment = process.env.NODE_ENV === "development";

export interface CachedFollowUser {
  id: string;
  userId: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followedAt: Date;
}

export interface CachedFollowList {
  data: CachedFollowUser[];
  meta: {
    cursor: string | null;
    hasNextPage: boolean;
  };
}

export interface CachedFollowStats {
  followersCount: number;
  followingCount: number;
}

export const followsCache = {
  getFollowers: (
    userId: string,
    cursor: string,
  ): Promise<CachedFollowList | undefined> => {
    if (isDevelopment) return Promise.resolve(undefined);
    return followersCache.get<CachedFollowList>(`${userId}:${cursor}`);
  },

  setFollowers: (
    userId: string,
    cursor: string,
    data: CachedFollowList,
  ): Promise<void> => {
    if (isDevelopment) return Promise.resolve();
    return followersCache.set(`${userId}:${cursor}`, data);
  },

  invalidateFollowers: async (userId: string): Promise<void> => {
    if (isDevelopment) return;
    await followersCache.delete(`${userId}:initial`);
  },

  getFollowing: (
    userId: string,
    cursor: string,
  ): Promise<CachedFollowList | undefined> => {
    if (isDevelopment) return Promise.resolve(undefined);
    return followingCache.get<CachedFollowList>(`${userId}:${cursor}`);
  },

  setFollowing: (
    userId: string,
    cursor: string,
    data: CachedFollowList,
  ): Promise<void> => {
    if (isDevelopment) return Promise.resolve();
    return followingCache.set(`${userId}:${cursor}`, data);
  },

  invalidateFollowing: async (userId: string): Promise<void> => {
    if (isDevelopment) return;
    await followingCache.delete(`${userId}:initial`);
  },

  getStats: (userId: string): Promise<CachedFollowStats | undefined> => {
    if (isDevelopment) return Promise.resolve(undefined);
    return statsCache.get<CachedFollowStats>(userId);
  },

  setStats: (userId: string, stats: CachedFollowStats): Promise<void> => {
    if (isDevelopment) return Promise.resolve();
    return statsCache.set(userId, stats);
  },

  invalidateStats: async (userId: string): Promise<void> => {
    if (isDevelopment) return;
    await statsCache.delete(userId);
  },

  getIsFollowing: (
    followerId: string,
    followingId: string,
  ): Promise<boolean | undefined> => {
    if (isDevelopment) return Promise.resolve(undefined);
    return isFollowingCache.get<boolean>(`${followerId}:${followingId}`);
  },

  setIsFollowing: (
    followerId: string,
    followingId: string,
    value: boolean,
  ): Promise<void> => {
    if (isDevelopment) return Promise.resolve();
    return isFollowingCache.set(`${followerId}:${followingId}`, value);
  },

  invalidateIsFollowing: async (
    followerId: string,
    followingId: string,
  ): Promise<void> => {
    if (isDevelopment) return;
    await isFollowingCache.delete(`${followerId}:${followingId}`);
  },

  invalidateAll: async (
    followerId: string,
    followingId: string,
  ): Promise<void> => {
    await Promise.all([
      followsCache.invalidateFollowers(followingId),
      followsCache.invalidateFollowing(followerId),
      followsCache.invalidateStats(followerId),
      followsCache.invalidateStats(followingId),
      followsCache.invalidateIsFollowing(followerId, followingId),
    ]);
  },
};
