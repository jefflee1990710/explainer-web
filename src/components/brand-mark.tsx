import Link from "next/link";

// Compact brand mark used in marketing and app chrome.
export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2">
      <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-xl bg-accent-ink text-[11px] font-bold text-lime shadow-[3px_3px_0_0_rgba(255,77,46,0.9)] transition-transform group-hover:-translate-y-0.5">
        Ex
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        Explainer
      </span>
    </Link>
  );
}
