import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FollowersList } from "@/components/user/followers-list";
import { getQueryClient, trpc } from "@/trpc/server";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Abonnés de @${params.username} | Nebula`,
  };
}

export default async function FollowersPage(props: Props) {
  const params = await props.params;
  const { username } = params;

  const user = await getQueryClient()
    .fetchQuery(trpc.auth.getByUsername.queryOptions({ username }))
    .catch(() => null);

  if (!user) {
    notFound();
  }

  // Prefetch first page of followers
  await getQueryClient().prefetchInfiniteQuery(
    trpc.follow.getFollowers.infiniteQueryOptions(
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
          <h1 className="text-xl font-bold">Abonnés</h1>
          <p className="text-sm text-muted-foreground">@{username}</p>
        </div>
      </div>

      <FollowersList userId={(user as any).id} />
    </div>
  );
}
