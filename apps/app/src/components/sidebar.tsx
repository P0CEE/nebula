"use client";

import { useDirectMessages } from "@nebula/realtime/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebula/ui/dropdown-menu";
import { Icons } from "@nebula/ui/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { CreatePostModal } from "./posts/create-post-modal";

export function Sidebar() {
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(trpc.auth.me.queryOptions());
  const { data: unreadCount } = useQuery(
    trpc.messages.getUnreadCount.queryOptions(),
  );

  // Update unread count on new message
  useDirectMessages((msg) => {
    if (msg.senderId !== user?.id) {
      queryClient.invalidateQueries({
        queryKey: trpc.messages.getUnreadCount.queryKey(),
      });
    }
  });

  return (
    <div className="flex flex-col h-screen sticky top-0 px-2 py-4 w-[275px] justify-between">
      <div className="flex flex-col gap-2 items-start w-full">
        <Link
          href="/"
          className="p-3 text-2xl font-bold rounded-full hover:bg-accent transition-colors mb-2 ml-1"
        >
          Nebula
        </Link>

        <nav className="flex flex-col gap-1 w-full">
          <SidebarLink
            href="/"
            icon={Icons.Home}
            label="Accueil"
            active={pathname === "/" || !!pathname?.match(/^\/[a-z]{2}$/)}
          />
          <SidebarLink
            href="/explore"
            icon={Icons.Search}
            label="Explorer"
            active={pathname?.includes("/explore")}
          />
          <SidebarLink
            href="/messages"
            icon={Icons.Mail}
            label="Messages"
            badge={unreadCount?.count}
            active={pathname?.includes("/messages")}
          />
          <SidebarLink
            href={user?.username ? `/${user.username}` : "/"}
            icon={Icons.User}
            label="Profil"
            active={
              user?.username ? pathname?.includes(`/${user.username}`) : false
            }
          />
        </nav>

        <div className="w-full mt-4 pr-4">
          <CreatePostModal />
        </div>
      </div>

      {user && (
        <div className="w-full pr-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-3 p-3 rounded-full hover:bg-accent transition-colors w-full text-left"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icons.User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {user.fullName || user.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user.username}
                  </p>
                </div>
                <Icons.MoreHorizontal className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-[250px]">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => {
                  document.cookie = "access_token=; path=/; max-age=0";
                  document.cookie = "refresh_token=; path=/; max-age=0";
                  window.location.href = "/login";
                }}
              >
                <Icons.SignOut className="w-4 h-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: any;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-5 p-3 rounded-full hover:bg-accent transition-colors text-xl pr-8 max-w-fit ${active ? "bg-accent" : ""}`}
    >
      <div className="relative">
        <Icon className="w-7 h-7" />
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </div>
      <span className={`${active ? "font-bold" : "font-medium"}`}>{label}</span>
    </Link>
  );
}
