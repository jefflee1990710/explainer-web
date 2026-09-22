import Image from "next/image";
import Link from "next/link";

// Compact brand mark used in marketing and app chrome.
export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2">
      <Image
        src="/logo.svg"
        alt=""
        width={32}
        height={32}
        priority
        className="h-8 w-8 transition-transform group-hover:-translate-y-0.5"
      />
      <span className="font-display text-lg font-bold tracking-tight">
        Explainer
      </span>
    </Link>
  );
}
