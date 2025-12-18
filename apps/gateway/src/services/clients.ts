import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import superjson from "superjson";
import type { AppRouter as AuthRouter } from "@/services/auth/trpc/router";
import type { AppRouter as FollowRouter } from "@/services/follow/trpc/router";
import type { AppRouter as MediaRouter } from "@/services/media/trpc/router";
import type { AppRouter as MessagesRouter } from "@/services/messages/trpc/router";
import type { AppRouter as PostRouter } from "@/services/posts/trpc/router";
import type { AppRouter as SearchRouter } from "@/services/search/trpc/router";
import type { AppRouter as TimelineRouter } from "@/services/timeline/trpc/router";

type ServiceClients = {
  auth: ReturnType<typeof createTRPCProxyClient<AuthRouter>>;
  posts: ReturnType<typeof createTRPCProxyClient<PostRouter>>;
  timeline: ReturnType<typeof createTRPCProxyClient<TimelineRouter>>;
  follow: ReturnType<typeof createTRPCProxyClient<FollowRouter>>;
  search: ReturnType<typeof createTRPCProxyClient<SearchRouter>>;
  media: ReturnType<typeof createTRPCProxyClient<MediaRouter>>;
  messages: ReturnType<typeof createTRPCProxyClient<MessagesRouter>>;
};

const createServiceClient = <T extends AnyRouter>(
  serviceUrl: string,
  userId?: string,
) => {
  const headers: Record<string, string> = {};
  if (userId) {
    headers["X-User-Id"] = userId;
  }

  return createTRPCProxyClient<T>({
    links: [
      // @ts-expect-error - superjson transformer type compatibility with generic router
      httpBatchLink<T>({
        url: `${serviceUrl}/trpc`,
        headers,
        transformer: superjson,
      }),
    ],
  });
};

export const getServiceClients = (userId?: string): ServiceClients => {
  return {
    auth: createServiceClient<AuthRouter>(
      process.env.AUTH_SERVICE_URL || "http://localhost:3010",
      userId,
    ),
    posts: createServiceClient<PostRouter>(
      process.env.POST_SERVICE_URL || "http://localhost:3011",
      userId,
    ),
    timeline: createServiceClient<TimelineRouter>(
      process.env.TIMELINE_SERVICE_URL || "http://localhost:3012",
      userId,
    ),
    follow: createServiceClient<FollowRouter>(
      process.env.FOLLOW_SERVICE_URL || "http://localhost:3013",
      userId,
    ),
    search: createServiceClient<SearchRouter>(
      process.env.SEARCH_SERVICE_URL || "http://localhost:3015",
      userId,
    ),
    media: createServiceClient<MediaRouter>(
      process.env.MEDIA_SERVICE_URL || "http://localhost:3017",
      userId,
    ),
    messages: createServiceClient<MessagesRouter>(
      process.env.MESSAGES_SERVICE_URL || "http://localhost:3018",
      userId,
    ),
  };
};
