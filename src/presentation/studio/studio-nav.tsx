"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { useRouteTransition } from "@/presentation/studio/route-transition";
import type { StudioNavItem, StudioNavSection } from "@/presentation/studio/studio-shell";
import { isStudioNavActive } from "@/presentation/studio/studio-nav-active";

const GROUP_SECTIONS: StudioNavSection[] = ["create", "character", "assets", "account"];

// OpenArt-inspired left side menu:
// 1. Prominent Home pill at top
// 2. TOOLS (1-column list of creation tools)
// 3. CHARACTER (indented tree items)
// 4. ASSETS (indented tree items)
export function StudioNav({
  items,
  forceExpanded = false,
}: {
  items: StudioNavItem[];
  forceExpanded?: boolean;
}) {
  const { t, locale } = useI18n();
  const { activePathname } = useRouteTransition();
  const [openGroups, setOpenGroups] = useState<Record<StudioNavSection, boolean>>({
    home: true,
    create: true,
    character: true,
    assets: true,
    account: true,
  });

  const labels: Record<StudioNavSection, string> = {
    home: locale === "zh-Hant" ? "首頁" : locale === "zh-Hans" ? "首页" : "Home",
    create: locale === "zh-Hant" ? "TOOLS · 創作工具" : locale === "zh-Hans" ? "TOOLS · 创作工具" : "TOOLS",
    character: locale === "zh-Hant" ? "AI INFLUENCER · 角色" : locale === "zh-Hans" ? "AI INFLUENCER · 角色" : "CHARACTER",
    assets: locale === "zh-Hant" ? "ASSETS · 素材與資產" : locale === "zh-Hans" ? "ASSETS · 素材与资产" : "ASSETS",
    account: t("production.shell.navAccount"),
  };

  const homeItems = items.filter((item) => item.section === "home");

  function toggleGroup(section: StudioNavSection) {
    setOpenGroups((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <nav
      aria-label={t("production.shell.mainNavAria")}
      className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${
        forceExpanded ? "gap-4 pr-0.5" : "items-center gap-2"
      }`}
    >
      {/* Top Home Pill Button */}
      {homeItems.map((item) => (
        <StudioHomePillLink
          key={item.href}
          item={item}
          active={isStudioNavActive(activePathname, item.href)}
          forceExpanded={forceExpanded}
        />
      ))}

      {GROUP_SECTIONS.map((section) => {
        const group = items.filter((item) => item.section === section);
        if (group.length === 0) return null;
        const labelId = `studio-nav-${section}`;
        const isOpen = !forceExpanded || (openGroups[section] ?? true);
        const isToolsSection = section === "create";

        return (
          <div
            key={section}
            role="group"
            aria-labelledby={labelId}
            className={`flex flex-col gap-1.5 ${forceExpanded ? "w-full" : "items-center"}`}
          >
            <button
              type="button"
              id={labelId}
              onClick={() => toggleGroup(section)}
              aria-expanded={isOpen}
              className={`cursor-pointer items-center gap-1.5 px-1.5 py-0.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--studio-muted)] transition hover:text-[var(--studio-ink)] ${
                forceExpanded ? "flex" : "hidden"
              }`}
            >
              <svg
                viewBox="0 0 16 16"
                className={`h-3 w-3 shrink-0 transition-transform duration-150 ${
                  isOpen ? "rotate-0" : "-rotate-90"
                }`}
                fill="currentColor"
                aria-hidden
              >
                <path d="M4.5 6l3.5 4 3.5-4H4.5z" />
              </svg>
              <span>{labels[section]}</span>
            </button>

            {isOpen ? (
              isToolsSection ? (
                <div className={`flex flex-col gap-1.5 ${forceExpanded ? "w-full" : "items-center"}`}>
                  {group.map((item) => (
                    <StudioToolTileLink
                      key={item.href}
                      item={item}
                      active={isStudioNavActive(activePathname, item.href)}
                      forceExpanded={forceExpanded}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className={`flex flex-col gap-0.5 ${
                    forceExpanded
                      ? "ml-2 border-l border-[var(--studio-line)] pl-2.5"
                      : "items-center"
                  }`}
                >
                  {group.map((item) => (
                    <StudioNavLink
                      key={item.href}
                      item={item}
                      active={isStudioNavActive(activePathname, item.href)}
                      forceExpanded={forceExpanded}
                    />
                  ))}
                </div>
              )
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function StudioHomePillLink({
  item,
  active,
  forceExpanded = false,
}: {
  item: StudioNavItem;
  active: boolean;
  forceExpanded?: boolean;
}) {
  return (
    <Link
      href={item.href}
      data-rail-tour={item.href}
      aria-label={item.label}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={`studio-home-pill group relative flex cursor-pointer items-center rounded-xl border text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] ${
        forceExpanded
          ? "min-h-11 w-full justify-start gap-2.5 px-3 py-2"
          : "h-11 w-11 shrink-0 justify-center p-0"
      } ${
        active
          ? "border-[#c6f24b]/80 bg-[var(--studio-fill)] text-[var(--studio-ink)] shadow-[0_0_18px_rgba(198,242,75,0.22)]"
          : "border-[var(--studio-line)] bg-[var(--studio-fill)]/70 text-[var(--studio-ink)] hover:border-[#c6f24b]/45 hover:bg-[var(--studio-fill)]"
      }`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors ${
          active ? "text-[#c6f24b]" : "text-[var(--studio-ink)]"
        }`}
      >
        <RailIcon name={item.icon} />
      </span>
      <span className={`truncate ${forceExpanded ? "inline" : "hidden"}`}>
        {item.label}
      </span>
      {forceExpanded ? <NavPending /> : null}
    </Link>
  );
}

function StudioToolTileLink({
  item,
  active,
  forceExpanded = false,
}: {
  item: StudioNavItem;
  active: boolean;
  forceExpanded?: boolean;
}) {
  return (
    <Link
      href={item.href}
      data-rail-tour={item.href}
      aria-label={item.label}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={`studio-tool-tile group relative flex cursor-pointer items-center rounded-xl border text-xs font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] ${
        forceExpanded
          ? "min-h-10 w-full justify-start gap-2.5 px-2.5 py-2"
          : "h-11 w-11 shrink-0 justify-center p-0"
      } ${
        active
          ? "border-[#c6f24b]/75 bg-[var(--studio-cyan-soft)] text-[var(--studio-ink)] shadow-[0_0_12px_rgba(198,242,75,0.16)]"
          : "border-[var(--studio-line)] bg-[var(--studio-fill)] text-[var(--studio-ink)] hover:border-[var(--studio-muted)]/50 hover:opacity-95"
      }`}
    >
      {item.imageUrl ? (
        <span className="h-6 w-6 shrink-0 overflow-hidden rounded-md border border-[var(--studio-line)] bg-[#12141c]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
      ) : (
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center transition-colors ${
            active ? "text-[#c6f24b]" : "text-[var(--studio-ink)]"
          }`}
        >
          <RailIcon name={item.icon} />
        </span>
      )}
      <span className={`min-w-0 flex-1 truncate ${forceExpanded ? "inline" : "hidden"}`}>
        {item.label}
      </span>
      {item.tag ? (
        <span
          className={`absolute -top-1.5 right-1.5 rounded-full bg-[#c6f24b] px-1.5 py-0.2 text-[9px] font-extrabold leading-tight text-[#12141c] shadow-2xs ${
            forceExpanded ? "inline-flex" : "hidden"
          }`}
        >
          {item.tag}
        </span>
      ) : null}
    </Link>
  );
}

function StudioNavLink({
  item,
  active,
  forceExpanded = false,
}: {
  item: StudioNavItem;
  active: boolean;
  forceExpanded?: boolean;
}) {
  return (
    <Link
      href={item.href}
      data-rail-tour={item.href}
      aria-label={item.label}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={`group flex cursor-pointer items-center rounded-xl text-[13px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] ${
        forceExpanded
          ? "min-h-9 w-full justify-start gap-2.5 px-2 py-1.5"
          : "h-10 w-10 shrink-0 justify-center p-0"
      } ${
        active
          ? "bg-[var(--studio-cyan-soft)] font-semibold text-[var(--studio-ink)]"
          : "font-medium text-[var(--studio-ink)]/85 hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)]"
      }`}
    >
      <span
        className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-colors duration-150 ${
          active ? "text-[#c6f24b]" : "text-[var(--studio-muted)] group-hover:text-[var(--studio-ink)]"
        }`}
      >
        <RailIcon name={item.icon} />
        {item.badge !== undefined && item.badge > 0 ? (
          <span
            className={`absolute -top-1 -right-1 min-w-[16px] items-center justify-center rounded-full bg-[#c6f24b] px-1 text-[10px] font-extrabold leading-4 text-[#12141c] shadow-2xs ${
              forceExpanded ? "hidden" : "inline-flex"
            }`}
          >
            {item.badge}
          </span>
        ) : null}
      </span>
      <span className={`truncate ${forceExpanded ? "inline" : "hidden"}`}>
        {item.label}
      </span>
      {item.badge !== undefined ? (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold tabular-nums ${
            forceExpanded ? "inline-flex" : "hidden"
          } ${
            item.badge > 0
              ? "bg-[#c6f24b] text-[#12141c]"
              : "bg-[var(--studio-fill)] text-[var(--studio-muted)]"
          }`}
        >
          {item.badge}
        </span>
      ) : null}
      {forceExpanded ? <NavPending /> : null}
    </Link>
  );
}

function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`ml-auto inline-block h-1.5 w-1.5 rounded-full bg-[var(--studio-teal)] ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

function RailIcon({ name }: { name: StudioNavItem["icon"] }) {
  const common = "h-4 w-4 shrink-0";
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
        <path d="M12 3.2 3.5 10v10.3a1.2 1.2 0 0 0 1.2 1.2h5.1v-6.2h4.4v6.2h5.1a1.2 1.2 0 0 0 1.2-1.2V10L12 3.2Z" />
      </svg>
    );
  }
  if (name === "projects") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <path d="M3 7.5h7l2 2H21V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V7.5Z" />
        <path d="M3 7.5V6A1.5 1.5 0 0 1 4.5 4.5H10l2 2" />
      </svg>
    );
  }
  if (name === "posts") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="m20 15-4.5-4.5L6 20" />
      </svg>
    );
  }
  if (name === "directors") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <rect x="2.5" y="5.5" width="13.5" height="13" rx="2.2" />
        <path d="m21.5 8-5.5 4 5.5 4V8Z" />
      </svg>
    );
  }
  if (name === "wardrobe") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <path d="M12 4.5 7.5 7.2v2.1h9V7.2L12 4.5Z" />
        <path d="M8.2 9.3h7.6l.7 10.2H7.5l.7-10.2Z" />
      </svg>
    );
  }
  if (name === "styles") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <path d="M7 4h10l-3 5h5l-9 11 2-7H6l1-9Z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "products") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <path d="M8 8.5h8l1 11H7l1-11Z" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
      </svg>
    );
  }
  if (name === "videos") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="m10 9 5 3-5 3V9Z" />
      </svg>
    );
  }
  if (name === "tasks") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  }
  if (name === "text") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <path d="M6 5.5h12M12 5.5v13" />
      </svg>
    );
  }
  if (name === "life") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.2 6.2l1.6 1.6M16.2 16.2l1.6 1.6M17.8 6.2l-1.6 1.6M7.8 16.2l-1.6 1.6" />
      </svg>
    );
  }
  if (name === "room") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.6 9h16.8M3.6 15h16.8M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" />
      </svg>
    );
  }
  if (name === "characters") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
      </svg>
    );
  }
  if (name === "mcp") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <path d="M8 8h8v8H8z" />
        <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6" />
      </svg>
    );
  }
  if (name === "affiliate") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <path d="M12 3.5 14.2 8l5 .7-3.6 3.5.9 5L12 14.8 7.5 17.2l.9-5L4.8 8.7 9.8 8 12 3.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
    </svg>
  );
}
