"use client";

import { Button } from "@nebula/ui/button";
import { Input } from "@nebula/ui/input";
import { Label } from "@nebula/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const trpc = useTRPC();

  const registerMutation = useMutation(trpc.auth.register.mutationOptions());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ email, password, username, fullName } as any, {
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
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={30}
          placeholder="johndoe"
          pattern="[a-zA-Z0-9_]+"
        />
        <p className="text-xs text-muted-foreground mt-1">
          3-30 characters, letters, numbers, and underscores only
        </p>
      </div>

      <div>
        <Label htmlFor="fullName">Full Name (optional)</Label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
        />
      </div>

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
          minLength={8}
          placeholder="••••••••"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Must be at least 8 characters
        </p>
      </div>

      <Button
        type="submit"
        disabled={registerMutation.isPending}
        className="w-full"
      >
        {registerMutation.isPending ? "Creating account..." : "Sign up"}
      </Button>

      {registerMutation.error && (
        <p className="text-destructive text-sm text-center">
          {registerMutation.error.message}
        </p>
      )}
    </form>
  );
}
