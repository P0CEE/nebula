"use client";

import {
  useDirectMessages,
  useMessageReadReceipts,
  useTypingIndicator,
} from "@nebula/realtime/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { formatRelativeTime } from "@/utils/format";
import { MessageInput } from "./message-input";

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
};

type Conversation = {
  id: string;
  otherUser: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  lastMessageAt: Date | null;
  createdAt: Date;
};

type Props = {
  oderId: string;
  currentUserId: string;
  initialConversation: Conversation;
  initialMessages: Message[];
};

export function ConversationView({
  oderId,
  currentUserId,
  initialConversation,
  initialMessages,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());

  const conversation = initialConversation;

  // Get messages with initial data
  const { data: messagesData } = useQuery({
    ...trpc.messages.getMessages.queryOptions({
      conversationId: conversation.id,
    }),
    initialData: {
      data: initialMessages,
      meta: { cursor: null, hasNextPage: false },
    },
  });

  const messages = useMemo(() => {
    return [...(messagesData?.data ?? [])].reverse();
  }, [messagesData]);

  // Typing indicator
  const { typingUsers, sendTyping } = useTypingIndicator(conversation.id);

  // Real-time messages
  useDirectMessages((msg) => {
    if (msg.conversationId === conversation.id) {
      queryClient.invalidateQueries({
        queryKey: trpc.messages.getMessages.queryKey({
          conversationId: conversation.id,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.messages.getUnreadCount.queryKey(),
      });
    }
  });

  // Real-time read receipts
  useMessageReadReceipts((event) => {
    if (event.conversationId === conversation.id) {
      setReadMessages((prev) => new Set(prev).add(event.messageId));
    }
  });

  // Mark messages as read
  const markReadMutation = useMutation(
    trpc.messages.markRead.mutationOptions(),
  );

  useEffect(() => {
    if (messages.length > 0 && conversation.id) {
      const unreadMessages = messages.filter(
        (m) => !m.readAt && m.senderId !== currentUserId,
      );
      for (const msg of unreadMessages) {
        markReadMutation.mutate({
          conversationId: conversation.id,
          messageId: msg.id,
        });
      }
    }
  }, [messages, conversation.id, currentUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessageSent = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.messages.getMessages.queryKey({
        conversationId: conversation.id,
      }),
    });
  };

  const isMessageRead = (msg: { id: string; readAt: Date | null }) =>
    msg.readAt !== null || readMessages.has(msg.id);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center font-bold">
          {conversation.otherUser?.username?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <h2 className="font-semibold">
            {conversation.otherUser?.fullName ||
              conversation.otherUser?.username ||
              "Utilisateur"}
          </h2>
          <p className="text-sm text-muted-foreground">
            @{conversation.otherUser?.username}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun message</p>
            <p className="text-sm text-muted-foreground mt-2">
              Envoyez le premier message!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                    suppressHydrationWarning
                  >
                    {formatRelativeTime(message.createdAt)}
                    {isOwn && isMessageRead(message) && " · Lu"}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          {typingUsers.map((u) => u.username).join(", ")} écrit...
        </div>
      )}

      {/* Input */}
      <MessageInput
        recipientId={oderId}
        onMessageSent={handleMessageSent}
        onTyping={sendTyping}
      />
    </div>
  );
}
