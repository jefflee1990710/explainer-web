"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/scroadmin/website", label: "1. 官網進站與註冊漏斗 (/website)", exact: true },
  { href: "/scroadmin/analytics", label: "2. 登入後創作行為分析 (/analytics)", exact: true },
  { href: "/scroadmin/analytics/directors", label: "3. 內建導演提示詞 (/directors)", exact: true },
];

// Switches the analytics console between website entry funnel, post-login funnel diagnostics, and the director inspector.
export function AnalyticsSectionNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2" aria-label="分析區">
      {LINKS.map((link) => {
        const active =
          link.href === "/scroadmin/website"
            ? pathname === "/scroadmin/website" || pathname === "/scroadmin/analytics/website"
            : link.href === "/scroadmin/analytics"
              ? pathname === "/scroadmin/analytics" || pathname === "/scroadmin/analysis"
              : link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-semibold ${
              active ? "bg-[#12141c] text-[#c6f24b]" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:text-[#12141c]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
