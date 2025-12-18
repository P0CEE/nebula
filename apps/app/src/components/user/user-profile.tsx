"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Icons } from "@nebula/ui/icons";
import { FollowButton } from "./follow-button";
import { FollowStats } from "./follow-stats";

type User = {
  id: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  createdAt: string | Date;
};

type Props = {
  user: User;
  currentUser?: User | null;
  locale: string;
  initialIsFollowing?: boolean;
  initialFollowersCount?: number;
  initialFollowingCount?: number;
};

export function UserProfile({
  user,
  currentUser,
  locale,
  initialIsFollowing,
  initialFollowersCount,
  initialFollowingCount,
}: Props) {
  if (!user) return null;

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-0">
        <div className="flex justify-between items-start">
          <div className="-mt-0">
            <div className="w-20 h-20 sm:w-32 sm:h-32 bg-secondary rounded-full border-4 border-background flex items-center justify-center text-3xl sm:text-5xl font-bold text-secondary-foreground overflow-hidden">
              {user.username[0]?.toUpperCase()}
            </div>
          </div>

          <div className="pt-0">
            {currentUser?.id === user.id ? (
              <button
                type="button"
                className="rounded-full border border-input bg-background font-semibold px-4 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Éditer le profil
              </button>
            ) : currentUser ? (
              <div className="flex gap-2">
                <Link
                  href={`/messages/${user.id}`}
                  className="rounded-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Icons.Mail className="w-4 h-4" />
                </Link>
                <FollowButton
                  userId={user.id}
                  initialIsFollowing={initialIsFollowing}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-xl font-bold leading-tight text-foreground flex items-center gap-1">
            {user.fullName || user.username}
            {/* Verified badge placeholder if needed */}
          </h1>
          <p className="text-muted-foreground text-sm">@{user.username}</p>
        </div>

        {user.bio && (
          <div className="mt-4 text-sm whitespace-pre-wrap">{user.bio}</div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            <span>
              A rejoint Nebula en{" "}
              {new Date(user.createdAt).toLocaleDateString(locale, {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="mt-4 pb-6">
          <FollowStats
            userId={user.id}
            username={user.username}
            initialFollowersCount={initialFollowersCount}
            initialFollowingCount={initialFollowingCount}
          />
        </div>
      </div>
    </div>
  );
}
