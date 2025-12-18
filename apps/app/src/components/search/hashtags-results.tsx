"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { LoadMore } from "@/components/load-more";
import { useTRPC } from "@/trpc/client";
import { formatRelativeTime } from "@/utils/format";

type Props = {
  hashtag: string;
};

export function HashtagsResults({ hashtag }: Props) {
  const { ref, inView } = useInView();
  const trpc = useTRPC();

  const infiniteQueryOptions = trpc.search.hashtags.infiniteQueryOptions(
    { hashtag, pageSize: 20 },
    { getNextPageParam: (lastPage: any) => lastPage?.meta?.cursor },
  );

  const { data, fetchNextPage, hasNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  useEffect(() => {
    if (inView) fetchNextPage();
  }, [inView, fetchNextPage]);

  const posts = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.data) ?? [];
  }, [data]);

  if (!posts.length) {
    return (
      <p className="text-muted-foreground py-4">No posts with this hashtag</p>
    );
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
      <LoadMore ref={ref} hasNextPage={hasNextPage} />
    </div>
  );
}
