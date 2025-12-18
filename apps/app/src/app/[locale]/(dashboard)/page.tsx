import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { PostsSkeleton } from "@/components/posts/posts-skeleton";
import { TimelineList } from "@/components/posts/timeline-list";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata = {
  title: "Timeline",
};

export default async function Page() {
  prefetch(
    trpc.timeline.getTimeline.infiniteQueryOptions({
      pageSize: 20,
    }),
  );

  return (
    <HydrateClient>
      <div className="p-4">
        <h1 className="text-xl font-bold">Timeline</h1>
      </div>

      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<PostsSkeleton />}>
          <TimelineList />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
