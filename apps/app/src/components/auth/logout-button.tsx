"use client";

import { Button } from "@nebula/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";

export function LogoutButton() {
  const router = useRouter();
  const trpc = useTRPC();

  const logoutMutation = useMutation(trpc.auth.logout.mutationOptions());

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        document.cookie =
          "access_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie =
          "refresh_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        router.push("/login");
      },
      onError: (error) => {
        console.error("Logout failed:", error);
        document.cookie =
          "access_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie =
          "refresh_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push("/login");
      },
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? "Logging out..." : "Logout"}
    </Button>
  );
}
