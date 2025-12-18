"use client";

import type { QueryClient } from "@tanstack/react-query";
import { isServer, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import superjson from "superjson";
import type { AppRouter } from "@/gateway/src/trpc/routers/_app";
import { makeQueryClient } from "./query-client";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

let browserQueryClient: QueryClient;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  }

  // Browser: make a new query client if we don't already have one
  // This is very important, so we don't re-make a new client if React
  // suspends during the initial render. This may not be needed if we
  // have a suspense boundary BELOW the creation of the query client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();

  return browserQueryClient;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  // Read access token from cookie
  const cookies = document.cookie.split("; ");
  const tokenCookie = cookies.find((c) => c.startsWith("access_token="));
  return tokenCookie ? (tokenCookie.split("=")[1] ?? null) : null;
}

function clearTokenAndRedirect() {
  if (typeof window !== "undefined") {
    document.cookie = "access_token=; path=/; max-age=0";
    window.location.href = "/login";
  }
}

export function TRPCReactProvider(
  props: Readonly<{
    children: React.ReactNode;
  }>,
) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3003"}/trpc`,
          transformer: superjson,
          headers() {
            const token = getAccessToken();

            return token ? { Authorization: `Bearer ${token}` } : {};
          },
          async fetch(url, options) {
            const response = await fetch(url, options);

            if (response.status === 401) {
              clearTokenAndRedirect();
            }

            return response;
          },
        }),
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
