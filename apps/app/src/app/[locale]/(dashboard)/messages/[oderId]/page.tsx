import { redirect } from "next/navigation";
import { ConversationView } from "@/components/messages/conversation-view";
import { getQueryClient, trpc } from "@/trpc/server";

type Props = {
  params: Promise<{ oderId: string; locale: string }>;
};

export const metadata = {
  title: "Conversation",
};

export default async function ConversationPage(props: Props) {
  const params = await props.params;
  const { oderId } = params;

  const currentUser = await getQueryClient()
    .fetchQuery(trpc.auth.me.queryOptions())
    .catch(() => null);

  if (!currentUser) {
    redirect("/login");
  }

  // Fetch conversation and messages
  const [conversation, messagesData] = await Promise.all([
    getQueryClient()
      .fetchQuery(
        trpc.messages.getConversationWithUser.queryOptions({ userId: oderId }),
      )
      .catch(() => null),
    getQueryClient()
      .fetchQuery(
        trpc.messages.getConversationWithUser.queryOptions({ userId: oderId }),
      )
      .then((conv) =>
        conv
          ? getQueryClient()
              .fetchQuery(
                trpc.messages.getMessages.queryOptions({
                  conversationId: conv.id,
                }),
              )
              .catch(() => null)
          : null,
      ),
  ]);

  if (!conversation) {
    redirect("/messages");
  }

  return (
    <div className="h-full">
      <ConversationView
        oderId={oderId}
        currentUserId={(currentUser as any).id}
        initialConversation={conversation}
        initialMessages={messagesData?.data ?? []}
      />
    </div>
  );
}
