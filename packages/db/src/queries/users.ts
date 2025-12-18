import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { users } from "../schema";

export const getUserById = async (db: Database, id: string) => {
  const [result] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      timeFormat: users.timeFormat,
      dateFormat: users.dateFormat,
      timezone: users.timezone,
      timezoneAutoSync: users.timezoneAutoSync,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));

  return result ?? null;
};

export const getUserByEmail = async (db: Database, email: string) => {
  const [result] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      password: users.password,
      fullName: users.fullName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      timeFormat: users.timeFormat,
      dateFormat: users.dateFormat,
      timezone: users.timezone,
      timezoneAutoSync: users.timezoneAutoSync,
      tokenVersion: users.tokenVersion,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.email, email));

  return result ?? null;
};

export const getUserByUsername = async (db: Database, username: string) => {
  const [result] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username));

  return result ?? null;
};

export type CreateUserParams = {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
};

export const createUser = async (db: Database, data: CreateUserParams) => {
  const [result] = await db
    .insert(users)
    .values({
      email: data.email,
      password: data.password,
      username: data.username,
      fullName: data.fullName,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
    })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      timeFormat: users.timeFormat,
      dateFormat: users.dateFormat,
      timezone: users.timezone,
      timezoneAutoSync: users.timezoneAutoSync,
      tokenVersion: users.tokenVersion,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return result;
};

export type UpdateUserParams = {
  id: string;
  username?: string | null;
  fullName?: string | null;
  bio?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  locale?: string | null;
  timeFormat?: number | null;
  dateFormat?: string | null;
  timezone?: string | null;
  timezoneAutoSync?: boolean | null;
};

export const updateUser = async (db: Database, data: UpdateUserParams) => {
  const { id, ...updateData } = data;

  const filteredData = Object.fromEntries(
    Object.entries(updateData).filter(
      ([_, value]) => value !== null && value !== undefined,
    ),
  );

  const [result] = await db
    .update(users)
    .set({
      ...filteredData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      bio: users.bio,
      email: users.email,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      timeFormat: users.timeFormat,
      dateFormat: users.dateFormat,
      timezone: users.timezone,
      timezoneAutoSync: users.timezoneAutoSync,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return result;
};

export const deleteUser = async (db: Database, id: string) => {
  await db.delete(users).where(eq(users.id, id));
  return { id };
};
