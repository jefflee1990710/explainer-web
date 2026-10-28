"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

/** Partner directory listings (dofollow backlinks for free-listing verification). */
const DIRECTORY_LINKS = [
  { label: "Twelve Tools", href: "https://twelve.tools" },
  { label: "AI Toolz Dir", href: "https://aitoolzdir.com" },
  { label: "ToolDisk", href: "https://tooldisk.com" },
  { label: "Dang.ai", href: "https://dang.ai" },
  { label: "Turbo0", href: "https://turbo0.com" },
  { label: "ToolPilot", href: "https://toolpilot.ai" },
  { label: "Toolfio", href: "https://toolfio.com" },
  { label: "Tulimoa", href: "https://tulimoa.com" },
  { label: "Uno Directory", href: "https://uno.directory" },
  { label: "EarlyHunt", href: "https://earlyhunt.com" },
  { label: "DailyPings", href: "https://dailypings.com" },
  { label: "Startup Fame", href: "https://startupfa.me" },
  { label: "SaaSCity", href: "https://saascity.io" },
  { label: "IndieLaunch", href: "https://indielaunch.dev" },
] as const;

// Site-wide links to pricing, examples, and the legal documents.
export function SiteFooter({ showAffiliate = false }: { showAffiliate?: boolean }) {
  const { t } = useI18n();

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">{t("legal.rights")}</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-zinc-600">
            <Link href="/posts" className="hover:text-[#12141c]">
              {t("nav.blog")}
            </Link>
            <Link href="/examples" className="hover:text-[#12141c]">
              {t("nav.features")}
            </Link>
            {showAffiliate ? (
              <Link href="/affiliate" className="hover:text-[#12141c]">
                {t("nav.affiliate")}
              </Link>
            ) : null}
            <Link href="/pricing" className="hover:text-[#12141c]">
              {t("nav.pricing")}
            </Link>
            <Link href="/contact" className="hover:text-[#12141c]">
              {t("contactPage.navLabel")}
            </Link>
            <Link href="/terms" className="hover:text-[#12141c]">
              {t("legal.terms")}
            </Link>
            <Link href="/privacy" className="hover:text-[#12141c]">
              {t("legal.privacy")}
            </Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-zinc-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Directories</p>
          <nav
            aria-label="Partner directories"
            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500"
          >
            {DIRECTORY_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#12141c]"
              >
                {label}
              </a>
            ))}
          </nav>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">Badges</p>
          <nav
            aria-label="Directory listing badges"
            className="mt-2 flex flex-wrap items-center gap-4"
          >
            <a
              href="https://tulimoa.com/discover/scro"
              target="_blank"
              rel="noopener"
              data-tulimoa-badge="light"
            >
              <img
                src="https://tulimoa.com/badge/light.svg"
                alt="Listed on Tulimoa"
                width={150}
                height={41}
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </a>
            <a
              href="https://turbo0.com/item/scro"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://img.turbo0.com/badge-listed-light.svg"
                alt="Listed on Turbo0"
                style={{ height: 54, width: "auto" }}
              />
            </a>
            <a href="https://tooldisk.com" target="_blank" rel="noopener noreferrer">
              <img
                src="https://tooldisk.com/badge/badge_light.svg"
                alt="Featured on ToolDisk.com"
                width={200}
                height={54}
              />
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
