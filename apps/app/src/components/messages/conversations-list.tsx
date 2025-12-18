"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { formatRelativeTime } from "@/utils/format";

export function ConversationsList() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.messages.getConversations.queryOptions({}),
  );

  const conversations = data?.data ?? [];

  if (!conversations.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucune conversation</p>
        <p className="text-sm text-muted-foreground mt-2">
          Envoyez un message depuis le profil d'un utilisateur
        </p>
      </div>
    );
  }

  return (
    <div>
      {conversations.map((conv) => (
        <Link
          key={conv.id}
          href={`/messages/${conv.otherUser?.id}`}
          className="flex items-center gap-3 p-4 hover:bg-accent transition-colors border-b border-border"
        >
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center font-bold text-lg">
            {conv.otherUser?.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold truncate">
                {conv.otherUser?.fullName ||
                  conv.otherUser?.username ||
                  "Utilisateur"}
              </span>
              {conv.lastMessageAt && (
                <span
                  className="text-sm text-muted-foreground"
                  suppressHydrationWarning
                >
                  {formatRelativeTime(conv.lastMessageAt)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              @{conv.otherUser?.username}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
