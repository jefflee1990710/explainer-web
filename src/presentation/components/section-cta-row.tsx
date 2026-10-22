import Link from "next/link";

type CtaLink = { href: string; label: string };

// Shared section footer actions. Light bands use the ink pill; dark bands use the lime pill.
export function SectionCtaRow({
  primary,
  secondary,
  tone = "light",
  align = "start",
}: {
  primary: CtaLink;
  secondary?: CtaLink;
  tone?: "light" | "dark";
  align?: "start" | "center";
}) {
  const primaryClass =
    tone === "dark"
      ? "inline-flex min-h-11 items-center justify-center rounded-full bg-[#c6f24b] px-7 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-[#b6e23a]"
      : "inline-flex min-h-11 items-center justify-center rounded-full bg-[#12141c] px-7 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black";
  const secondaryClass =
    tone === "dark"
      ? "inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-white/10 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
      : "inline-flex min-h-11 items-center justify-center rounded-full border border-[#e4e4e7] bg-white px-7 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-100";

  return (
    <div className={`mt-8 flex flex-wrap gap-3 ${align === "center" ? "justify-center" : ""}`}>
      <Link href={primary.href} className={primaryClass}>
        {primary.label}
      </Link>
      {secondary ? (
        <Link href={secondary.href} className={secondaryClass}>
          {secondary.label}
        </Link>
      ) : null}
    </div>
  );
}

// Compact action under one card, so each session can point somewhere different.
export function CardCta({ href, label, tone = "light" }: { href: string; label: string; tone?: "light" | "dark" }) {
  const className =
    tone === "dark"
      ? "mt-4 inline-flex items-center text-sm font-semibold text-[#c6f24b] underline-offset-4 hover:underline"
      : "mt-4 inline-flex items-center text-sm font-semibold text-[#12141c] underline-offset-4 hover:underline";
  return (
    <Link href={href} className={className}>
      {label}
      <span aria-hidden className="ml-1">
        →
      </span>
    </Link>
  );
}
