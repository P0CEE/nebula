import { Suspense } from "react";
import { ConversationsList } from "@/components/messages/conversations-list";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata = {
  title: "Messages",
};

export default async function MessagesPage() {
  prefetch(trpc.messages.getConversations.queryOptions({}));

  return (
    <HydrateClient>
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-bold">Messages</h1>
      </div>

      <Suspense
        fallback={
          <div className="p-4">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-secondary rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-secondary rounded w-1/3" />
                    <div className="h-3 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      >
        <ConversationsList />
      </Suspense>
    </HydrateClient>
  );
}
