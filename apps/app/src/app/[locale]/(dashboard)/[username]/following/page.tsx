import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FollowingList } from "@/components/user/following-list";
import { getQueryClient, trpc } from "@/trpc/server";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Abonnements de @${params.username} | Nebula`,
  };
}

export default async function FollowingPage(props: Props) {
  const params = await props.params;
  const { username } = params;

  const user = await getQueryClient()
    .fetchQuery(trpc.auth.getByUsername.queryOptions({ username }))
    .catch(() => null);

  if (!user) {
    notFound();
  }

  // Prefetch first page of following
  await getQueryClient().prefetchInfiniteQuery(
    trpc.follow.getFollowing.infiniteQueryOptions(
      {
        userId: (user as any).id,
        pageSize: 20,
      },
      {
        getNextPageParam: (lastPage: any) => lastPage?.meta?.cursor,
      },
    ),
  );

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold">Abonnements</h1>
          <p className="text-sm text-muted-foreground">@{username}</p>
        </div>
      </div>

      <FollowingList userId={(user as any).id} />
    </div>
  );
}
