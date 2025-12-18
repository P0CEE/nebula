"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Props = {
  userId: string;
  initialIsFollowing?: boolean;
};

export function FollowButton({ userId, initialIsFollowing = false }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: isFollowingData } = useQuery({
    ...trpc.follow.isFollowing.queryOptions({ userId }),
    initialData: { isFollowing: initialIsFollowing },
  });

  const isFollowing = (isFollowingData as any)?.isFollowing ?? false;

  const followMutation = useMutation(
    trpc.follow.follow.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({
          queryKey: trpc.follow.isFollowing.queryKey({ userId }),
        });
        queryClient.setQueryData(trpc.follow.isFollowing.queryKey({ userId }), {
          isFollowing: true,
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.follow.getFollowStats.queryKey({ userId }),
        });
      },
      onError: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.follow.isFollowing.queryKey({ userId }),
        });
      },
    }),
  );

  const unfollowMutation = useMutation(
    trpc.follow.unfollow.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({
          queryKey: trpc.follow.isFollowing.queryKey({ userId }),
        });
        queryClient.setQueryData(trpc.follow.isFollowing.queryKey({ userId }), {
          isFollowing: false,
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.follow.getFollowStats.queryKey({ userId }),
        });
      },
      onError: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.follow.isFollowing.queryKey({ userId }),
        });
      },
    }),
  );

  const handleClick = () => {
    if (isFollowing) {
      unfollowMutation.mutate({ userId });
    } else {
      followMutation.mutate({ userId });
    }
  };

  const isLoading = followMutation.isPending || unfollowMutation.isPending;

  if (isFollowing) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-full border border-input bg-background font-semibold px-4 py-1.5 text-sm hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors disabled:opacity-50"
      >
        {isLoading ? "..." : "Abonné"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="rounded-full bg-foreground text-background font-semibold px-4 py-1.5 text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
    >
      {isLoading ? "..." : "Suivre"}
    </button>
  );
}
