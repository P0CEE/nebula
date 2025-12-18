"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { LoadMore } from "@/components/load-more";
import { useTRPC } from "@/trpc/client";

type Props = {
  query: string;
  limit?: number;
};

export function UsersResults({ query, limit }: Props) {
  const { ref, inView } = useInView();
  const trpc = useTRPC();

  const infiniteQueryOptions = trpc.search.users.infiniteQueryOptions(
    { query, pageSize: limit || 20 },
    { getNextPageParam: (lastPage: any) => lastPage?.meta?.cursor },
  );

  const { data, fetchNextPage, hasNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  useEffect(() => {
    if (inView && !limit) fetchNextPage();
  }, [inView, fetchNextPage, limit]);

  const users = useMemo(() => {
    const all = data?.pages.flatMap((page: any) => page.data) ?? [];
    return limit ? all.slice(0, limit) : all;
  }, [data, limit]);

  if (!users.length) {
    return <p className="text-muted-foreground py-4">No users found</p>;
  }

  return (
    <div>
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/${user.username}`}
          className="block border-t border-border p-4 hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold">@{user.username}</p>
              {user.fullName && (
                <p className="text-sm text-muted-foreground">{user.fullName}</p>
              )}
              {user.bio && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {user.bio}
                </p>
              )}
            </div>
            {user.followersCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {user.followersCount} followers
              </span>
            )}
          </div>
        </Link>
      ))}
      {!limit && <LoadMore ref={ref} hasNextPage={hasNextPage} />}
    </div>
  );
}
