import Image from "next/image";
import Link from "next/link";

// Compact brand mark used in marketing and app chrome.
export function BrandMark({
  href = "/",
  wordClassName = "hidden text-xl font-bold tracking-tight sm:inline",
}: {
  href?: string;
  // Hide the word on the collapsed rail; marketing keeps the default.
  wordClassName?: string;
}) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2">
      <Image
        src="/logo-mark.png"
        alt=""
        width={160}
        height={160}
        priority
        className="h-10 w-10 transition-transform group-hover:-translate-y-0.5"
      />
      <span className={wordClassName}>Scro</span>
    </Link>
  );
}
