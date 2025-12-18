import Image from "next/image";
import { AuthTabs } from "@/components/auth/auth-tabs";

export const metadata = {
  title: "Login | Nebula",
};

export default function Page() {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="flex flex-col items-center gap-8 max-w-md w-full">
        <Image src="/logo.png" alt="Nebula logo" width={120} height={120} />
        <AuthTabs />
      </div>
    </div>
  );
}
