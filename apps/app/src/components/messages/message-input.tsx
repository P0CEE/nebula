"use client";

import { Icons } from "@nebula/ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTRPC } from "@/trpc/client";

type Props = {
  recipientId: string;
  onMessageSent?: () => void;
  onTyping?: () => void;
};

export function MessageInput({ recipientId, onMessageSent, onTyping }: Props) {
  const [content, setContent] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const lastTypingRef = useRef<number>(0);

  const sendMutation = useMutation(
    trpc.messages.send.mutationOptions({
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({
          queryKey: trpc.messages.getMessages.queryKey({ conversationId: "" }),
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.messages.getConversations.queryKey({}),
        });
        onMessageSent?.();
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sendMutation.isPending) return;

    sendMutation.mutate({
      recipientId,
      content: content.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Emit typing indicator (throttled to 2s)
    const now = Date.now();
    if (onTyping && now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      onTyping();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-secondary rounded-2xl">
          <textarea
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            className="w-full bg-transparent px-4 py-3 resize-none focus:outline-none min-h-[44px] max-h-32"
            rows={1}
          />
        </div>
        <button
          type="submit"
          disabled={!content.trim() || sendMutation.isPending}
          className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icons.Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
