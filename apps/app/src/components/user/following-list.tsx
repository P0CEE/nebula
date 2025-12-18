"use client";

import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useEffect, useMemo } from "react";
import { LoadMore } from "@/components/load-more";

type Props = {
  userId: string;
};

export function FollowingList({ userId }: Props) {
  const { ref, inView } = useInView();
  const trpc = useTRPC();

  const infiniteQueryOptions = trpc.follow.getFollowing.infiniteQueryOptions(
    {
      userId,
      pageSize: 20,
    },
    {
      getNextPageParam: (lastPage: any) => lastPage?.meta?.cursor,
    },
  );

  const { data, fetchNextPage, hasNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  const following = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.data) ?? [];
  }, [data]);

  if (following.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Aucun abonnement pour le moment
      </div>
    );
  }

  return (
    <div>
      {following.map((user) => (
        <Link
          key={user.id}
          href={`/${user.username}`}
          className="flex items-center gap-3 p-4 hover:bg-accent transition-colors border-b border-border"
        >
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-xl font-bold text-secondary-foreground">
            {user.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">
              {user.fullName || user.username}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              @{user.username}
            </div>
            {user.bio && (
              <div className="text-sm mt-1 line-clamp-1">{user.bio}</div>
            )}
          </div>
        </Link>
      ))}

      <LoadMore ref={ref} hasNextPage={hasNextPage ?? false} />
    </div>
  );
}
