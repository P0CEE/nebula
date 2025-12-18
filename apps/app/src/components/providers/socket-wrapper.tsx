"use client";

import { SocketProvider } from "@nebula/realtime/client";
import { useEffect, useState, type ReactNode } from "react";

function getTokenFromCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/access_token=([^;]+)/);
  return match?.[1];
}

export function SocketWrapper({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    setToken(getTokenFromCookie());
  }, []);

  const url = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (!url) return <>{children}</>;

  return (
    <SocketProvider url={url} token={token}>
      {children}
    </SocketProvider>
  );
}
