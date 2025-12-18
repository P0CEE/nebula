"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { LoadMore } from "@/components/load-more";
import { useTRPC } from "@/trpc/client";
import { formatRelativeTime } from "@/utils/format";

type Props = {
  query: string;
  limit?: number;
};

export function PostsResults({ query, limit }: Props) {
  const { ref, inView } = useInView();
  const trpc = useTRPC();

  const infiniteQueryOptions = trpc.search.posts.infiniteQueryOptions(
    { query, pageSize: limit || 20 },
    { getNextPageParam: (lastPage: any) => lastPage?.meta?.cursor },
  );

  const { data, fetchNextPage, hasNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  useEffect(() => {
    if (inView && !limit) fetchNextPage();
  }, [inView, fetchNextPage, limit]);

  const posts = useMemo(() => {
    const all = data?.pages.flatMap((page: any) => page.data) ?? [];
    return limit ? all.slice(0, limit) : all;
  }, [data, limit]);

  if (!posts.length) {
    return <p className="text-muted-foreground py-4">No posts found</p>;
  }

  return (
    <div>
      {posts.map((post) => (
        <div key={post.id} className="border-t border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold">
              {post.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href={`/${post.username}`}
                  className="font-semibold hover:underline"
                >
                  @{post.username}
                </Link>
                {post.fullName && (
                  <span className="text-sm text-muted-foreground">
                    {post.fullName}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">·</span>
                <span
                  className="text-sm text-muted-foreground"
                  suppressHydrationWarning
                >
                  {formatRelativeTime(post.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{post.content}</p>
              {post.hashtags?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {post.hashtags.map((tag: string) => (
                    <span key={tag} className="text-sm text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {!limit && <LoadMore ref={ref} hasNextPage={hasNextPage} />}
    </div>
  );
}
