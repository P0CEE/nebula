import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/error-fallback";
import { SearchContainer } from "@/components/search/search-container";
import { HydrateClient } from "@/trpc/server";

export const metadata = {
  title: "Explore",
};

export default function ExplorePage() {
  return (
    <HydrateClient>
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-bold">Explore</h1>
      </div>

      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={null}>
          <SearchContainer />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
