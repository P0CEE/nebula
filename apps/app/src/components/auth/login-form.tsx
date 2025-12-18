"use client";

import { Button } from "@nebula/ui/button";
import { Input } from "@nebula/ui/input";
import { Label } from "@nebula/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const trpc = useTRPC();

  const loginMutation = useMutation(trpc.auth.login.mutationOptions());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password } as any, {
      onSuccess: async (data: any) => {
        await fetch("/api/auth/set-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: data.accessToken,
          }),
        });

        router.push("/");
      },
      onError: (error) => {
        alert(error.message);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />
      </div>

      <Button
        type="submit"
        disabled={loginMutation.isPending}
        className="w-full"
      >
        {loginMutation.isPending ? "Logging in..." : "Log in"}
      </Button>

      {loginMutation.error && (
        <p className="text-destructive text-sm text-center">
          {loginMutation.error.message}
        </p>
      )}
    </form>
  );
}
