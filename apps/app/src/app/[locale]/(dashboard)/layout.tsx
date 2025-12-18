import { Sidebar } from "@/components/sidebar";
import { SocketWrapper } from "@/components/providers/socket-wrapper";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SocketWrapper>
      <div className="container mx-auto flex min-h-screen">
        <Sidebar />
        <main className="flex-1 border-x min-h-screen">{children}</main>
      </div>
    </SocketWrapper>
  );
}
