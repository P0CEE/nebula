"use client";

import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

type Props = {
  userId: string;
  username: string;
  initialFollowersCount?: number;
  initialFollowingCount?: number;
};

export function FollowStats({
  userId,
  username,
  initialFollowersCount = 0,
  initialFollowingCount = 0,
}: Props) {
  const trpc = useTRPC();
  const { data: stats } = useQuery({
    ...trpc.follow.getFollowStats.queryOptions({ userId }),
    initialData: {
      followersCount: initialFollowersCount,
      followingCount: initialFollowingCount,
    },
  });

  const followingCount = (stats as any)?.followingCount ?? 0;
  const followersCount = (stats as any)?.followersCount ?? 0;

  return (
    <div className="flex gap-4 text-sm">
      <Link
        href={`/${username}/following`}
        className="flex gap-1 hover:underline"
      >
        <span className="font-bold">{followingCount}</span>
        <span className="text-muted-foreground">abonnements</span>
      </Link>
      <Link
        href={`/${username}/followers`}
        className="flex gap-1 hover:underline"
      >
        <span className="font-bold">{followersCount}</span>
        <span className="text-muted-foreground">abonnés</span>
      </Link>
    </div>
  );
}
