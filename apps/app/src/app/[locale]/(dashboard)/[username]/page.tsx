import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { PostsList } from "@/components/posts/posts-list";
import { PostsSkeleton } from "@/components/posts/posts-skeleton";
import { UserProfile } from "@/components/user/user-profile";
import { batchPrefetch, getQueryClient, trpc } from "@/trpc/server";

type Props = {
  params: Promise<{ username: string; locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `@${params.username} | Nebula`,
  };
}

export default async function UserPage(props: Props) {
  const params = await props.params;
  const { username, locale } = params;

  const [user, currentUser] = await Promise.all([
    getQueryClient().fetchQuery(
      trpc.auth.getByUsername.queryOptions({ username }),
    ),
    getQueryClient()
      .fetchQuery(trpc.auth.me.queryOptions())
      .catch(() => null),
  ]);

  // Fetch follow data
  const [isFollowingData, followStats] = await Promise.all([
    currentUser
      ? getQueryClient()
          .fetchQuery(
            trpc.follow.isFollowing.queryOptions({
              userId: (user as any).id,
            }),
          )
          .catch(() => ({ isFollowing: false }))
      : Promise.resolve({ isFollowing: false }),
    getQueryClient()
      .fetchQuery(
        trpc.follow.getFollowStats.queryOptions({ userId: (user as any).id }),
      )
      .catch(() => ({ followersCount: 0, followingCount: 0 })),
  ]);

  // Prefetch posts
  batchPrefetch([
    trpc.auth.getByUsername.queryOptions({ username }),
    trpc.posts.getByUserId.infiniteQueryOptions({
      userId: (user as any).id,
      pageSize: 20,
    }),
  ]);

  return (
    <div className="flex flex-col">
      <Suspense fallback={<div>Loading profile...</div>}>
        <UserProfile
          user={user as any}
          currentUser={currentUser as any}
          locale={locale}
          initialIsFollowing={(isFollowingData as any)?.isFollowing}
          initialFollowersCount={(followStats as any)?.followersCount}
          initialFollowingCount={(followStats as any)?.followingCount}
        />
      </Suspense>

      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<PostsSkeleton />}>
          <PostsList userId={(user as any).id} locale={locale} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
