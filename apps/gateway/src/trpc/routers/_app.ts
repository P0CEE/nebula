import { createTRPCRouter } from "../init";
import { authProxyRouter } from "./proxy/auth";
import { followProxyRouter } from "./proxy/follow";
import { mediaProxyRouter } from "./proxy/media";
import { messagesProxyRouter } from "./proxy/messages";
import { postsProxyRouter } from "./proxy/posts";
import { searchProxyRouter } from "./proxy/search";
import { timelineProxyRouter } from "./proxy/timeline";

// Gateway router - proxies all calls to microservices via HTTP
export const appRouter = createTRPCRouter({
  auth: authProxyRouter,
  posts: postsProxyRouter,
  follow: followProxyRouter,
  timeline: timelineProxyRouter,
  search: searchProxyRouter,
  media: mediaProxyRouter,
  messages: messagesProxyRouter,
});

export type AppRouter = typeof appRouter;
