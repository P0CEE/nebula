import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center text-sm text-[#606060]">
      <Image
        src="/logo.png"
        width={80}
        height={80}
        alt="Ramnn"
        quality={100}
        className="mb-10"
      />
      <h2 className="text-xl font-semibold mb-2">Not Found</h2>
      <p className="mb-4">Could not find requested resource</p>
      <Link href="/" className="underline">
        Return Home
      </Link>
    </div>
  );
}
