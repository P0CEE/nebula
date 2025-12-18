"use client";

import { Suspense } from "react";
import type { SearchTab } from "./search-tabs";
import { PostsResults } from "./posts-results";
import { UsersResults } from "./users-results";
import { HashtagsResults } from "./hashtags-results";
import { SearchResultsSkeleton } from "./search-results-skeleton";

type Props = {
  query: string;
  tab: SearchTab;
};

export function SearchResults({ query, tab }: Props) {
  if (tab === "all") {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-2">Posts</h2>
          <Suspense fallback={<SearchResultsSkeleton />}>
            <PostsResults query={query} limit={3} />
          </Suspense>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Users</h2>
          <Suspense fallback={<SearchResultsSkeleton />}>
            <UsersResults query={query} limit={3} />
          </Suspense>
        </section>
      </div>
    );
  }

  if (tab === "posts") {
    return (
      <Suspense fallback={<SearchResultsSkeleton />}>
        <PostsResults query={query} />
      </Suspense>
    );
  }

  if (tab === "users") {
    return (
      <Suspense fallback={<SearchResultsSkeleton />}>
        <UsersResults query={query} />
      </Suspense>
    );
  }

  if (tab === "hashtags") {
    return (
      <Suspense fallback={<SearchResultsSkeleton />}>
        <HashtagsResults hashtag={query} />
      </Suspense>
    );
  }

  return null;
}
