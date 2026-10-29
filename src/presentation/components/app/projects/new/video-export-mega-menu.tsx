"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "@/presentation/components/spinner";

export type ExportShareTargetId =
  | "download"
  | "whatsapp"
  | "native_share"
  | "instagram_reel"
  | "instagram_story"
  | "instagram_post"
  | "tiktok"
  | "youtube_shorts"
  | "threads"
  | "facebook"
  | "x"
  | "xiaohongshu";

export type ExportShareTargetSpec = {
  id: ExportShareTargetId;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  badge?: string;
  needsHostedUrl?: boolean;
};

export const PRIMARY_EXPORT_TARGETS: readonly ExportShareTargetSpec[] = [
  {
    id: "download",
    titleZh: "下載 MP4 影片",
    titleEn: "Download MP4 Video",
    subtitleZh: "直接匯出並儲存 1080p MP4 到裝置",
    subtitleEn: "Render & save 1080p MP4 to your device",
    badge: "MP4",
  },
  {
    id: "whatsapp",
    titleZh: "WhatsApp 傳送影片",
    titleEn: "Send Video by WhatsApp",
    subtitleZh: "匯出影片並直接開啟 WhatsApp 傳送",
    subtitleEn: "Export video & open WhatsApp share directly",
    badge: "即時傳送",
    needsHostedUrl: true,
  },
  {
    id: "native_share",
    titleZh: "系統原生分享 (AirDrop / App)",
    titleEn: "System Share (AirDrop / Apps)",
    subtitleZh: "直接把 MP4 檔案傳送至手機或桌面 App",
    subtitleEn: "Pass exported MP4 file directly to native apps",
  },
];

export const INSTAGRAM_EXPORT_TARGETS: readonly ExportShareTargetSpec[] = [
  {
    id: "instagram_reel",
    titleZh: "Instagram Reel",
    titleEn: "Share as IG Reel",
    subtitleZh: "下載 MP4、複製文案並打開 IG（撳左側「+ 建立」上傳）",
    subtitleEn: "Download MP4, copy caption & open IG (click '+' Create)",
    badge: "最常用",
  },
  {
    id: "instagram_story",
    titleZh: "Instagram Story 限時動態",
    titleEn: "Share to IG Story",
    subtitleZh: "下載 MP4、複製文案並打開 IG 限時動態分享",
    subtitleEn: "Download MP4, copy caption & open IG Story",
  },
  {
    id: "instagram_post",
    titleZh: "Instagram Post 貼文",
    titleEn: "Share as IG Post",
    subtitleZh: "下載 MP4、複製文案並打開 IG（撳左側「+ 建立」上傳）",
    subtitleEn: "Download MP4, copy caption & open IG (click '+' Create)",
  },
];

export const SOCIAL_EXPORT_TARGETS: readonly ExportShareTargetSpec[] = [
  {
    id: "tiktok",
    titleZh: "TikTok",
    titleEn: "TikTok",
    subtitleZh: "匯出並開啟 TikTok Studio 上傳",
    subtitleEn: "Export & open TikTok Studio",
  },
  {
    id: "youtube_shorts",
    titleZh: "YouTube Shorts",
    titleEn: "YouTube Shorts",
    subtitleZh: "匯出並開啟 YouTube Studio 上傳",
    subtitleEn: "Export & open YouTube Studio",
  },
  {
    id: "threads",
    titleZh: "Threads",
    titleEn: "Threads",
    subtitleZh: "匯出並連同影片開啟 Threads 發佈",
    subtitleEn: "Export & open Threads composer",
    needsHostedUrl: true,
  },
  {
    id: "facebook",
    titleZh: "Facebook Reel / Post",
    titleEn: "Facebook",
    subtitleZh: "匯出並開啟 Facebook 影片分享",
    subtitleEn: "Export & open Facebook share",
    needsHostedUrl: true,
  },
  {
    id: "x",
    titleZh: "X (Twitter)",
    titleEn: "X (Twitter)",
    subtitleZh: "匯出並開啟 X 貼文分享",
    subtitleEn: "Export & open X post composer",
    needsHostedUrl: true,
  },
  {
    id: "xiaohongshu",
    titleZh: "小紅書 RedNote",
    titleEn: "RedNote (Xiaohongshu)",
    subtitleZh: "匯出並開啟小紅書創作者發佈頁",
    subtitleEn: "Export & open RedNote Studio",
  },
];

export const ALL_EXPORT_SHARE_TARGETS: readonly ExportShareTargetSpec[] = [
  ...PRIMARY_EXPORT_TARGETS,
  ...INSTAGRAM_EXPORT_TARGETS,
  ...SOCIAL_EXPORT_TARGETS,
];

// Build the direct social media sharing URL for the given target.
export function buildExportShareTargetUrl({
  targetId,
  videoUrl,
  title,
}: {
  targetId: ExportShareTargetId;
  videoUrl?: string;
  title: string;
}): string {
  const cleanTitle = title.trim() || "New Video";
  const cleanUrl = videoUrl?.trim() || "";
  const combinedText = cleanUrl ? `${cleanTitle}\n${cleanUrl}` : cleanTitle;

  switch (targetId) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(combinedText)}`;
    // Instagram Web has no standalone `/reels/create/` URL (it returns "Sorry, this page isn't available.");
    // Reels, Stories, and Posts are uploaded via the left-sidebar "+" (Create) modal on `https://www.instagram.com/`.
    case "instagram_reel":
    case "instagram_story":
    case "instagram_post":
      return "https://www.instagram.com/";
    case "tiktok":
      return "https://www.tiktok.com/tiktokstudio/upload";
    case "youtube_shorts":
      return "https://studio.youtube.com/channel/UC/videos/upload?d=ud";
    case "threads":
      return `https://www.threads.net/intent/post?text=${encodeURIComponent(combinedText)}`;
    case "facebook":
      return cleanUrl
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cleanUrl)}&quote=${encodeURIComponent(cleanTitle)}`
        : "https://www.facebook.com/reels/create/";
    case "x": {
      const params = new URLSearchParams({ text: cleanTitle });
      if (cleanUrl) params.set("url", cleanUrl);
      return `https://x.com/intent/post?${params.toString()}`;
    }
    case "xiaohongshu":
      return "https://creator.xiaohongshu.com/publish/publish";
    default:
      return "";
  }
}

// Export Video button with a hover/click Mega Submenu for direct download, WhatsApp, IG Reel/Story/Post, and social platforms.
export function VideoExportMegaMenu({
  label,
  busy,
  activeTarget,
  disabled,
  hint,
  locale = "zh-Hant",
  onSelectTarget,
}: {
  label: string;
  busy: boolean;
  activeTarget?: ExportShareTargetId | null;
  disabled: boolean;
  hint?: string;
  locale?: string;
  onSelectTarget: (targetId: ExportShareTargetId) => void;
}) {
  const isZh = locale.startsWith("zh");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }

  function openMenu() {
    if (disabled) return;
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    updatePosition();
    setOpen(true);
  }

  function scheduleClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
    }, 220);
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  function handlePick(targetId: ExportShareTargetId) {
    if (disabled || busy) return;
    setOpen(false);
    onSelectTarget(targetId);
  }

  const megaMenu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={isZh ? "匯出與直接分享選單" : "Export and share menu"}
            style={{ top: coords.top, right: coords.right }}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
            className="fixed z-[130] w-[min(94vw,38rem)] overflow-hidden rounded-2xl border-2 border-[#12141c] bg-white p-4 text-[#12141c] shadow-[6px_6px_0_0_#12141c]"
          >
            {/* Header Banner */}
            <div className="flex items-center justify-between border-b border-[#12141c]/10 pb-3">
              <div>
                <p className="font-display text-sm font-bold text-[#12141c]">
                  {isZh
                    ? "匯出影片與一鍵發佈 · Export & Direct Share"
                    : "Export Video & Direct Social Share"}
                </p>
                <p className="mt-0.5 text-xs text-[#5c6170]">
                  {isZh
                    ? "點擊任何平台會即時匯出最新 MP4 影片、複製文案並直接打開該平台發佈畫面"
                    : "Clicking any destination exports your latest MP4 and opens the platform directly"}
                </p>
              </div>
              <span className="rounded-full bg-[#c6f24b] px-2.5 py-0.5 font-display text-[11px] font-bold text-[#12141c]">
                1080p MP4
              </span>
            </div>

            {/* Section 1: Download & WhatsApp / Native Share */}
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-bold tracking-wider text-[#5c6170] uppercase">
                {isZh ? "直接下載與即時通訊 · Download & Instant Send" : "Download & Instant Messaging"}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {PRIMARY_EXPORT_TARGETS.map((item) => (
                  <MegaMenuCard
                    key={item.id}
                    item={item}
                    isZh={isZh}
                    busy={busy && activeTarget === item.id}
                    disabled={disabled || busy}
                    highlight={item.id === "download" || item.id === "whatsapp"}
                    onClick={() => handlePick(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Section 2: Instagram Direct (Reel / Story / Post) */}
            <div className="mt-3.5">
              <p className="mb-1.5 text-[11px] font-bold tracking-wider text-[#5c6170] uppercase">
                {isZh ? "Instagram 直接發佈 · Instagram Direct" : "Instagram Direct"}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {INSTAGRAM_EXPORT_TARGETS.map((item) => (
                  <MegaMenuCard
                    key={item.id}
                    item={item}
                    isZh={isZh}
                    busy={busy && activeTarget === item.id}
                    disabled={disabled || busy}
                    highlight={item.id === "instagram_reel"}
                    onClick={() => handlePick(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Section 3: Other Social Platforms */}
            <div className="mt-3.5">
              <p className="mb-1.5 text-[11px] font-bold tracking-wider text-[#5c6170] uppercase">
                {isZh ? "其他社交平台 · More Social Media" : "More Social Platforms"}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SOCIAL_EXPORT_TARGETS.map((item) => (
                  <MegaMenuCard
                    key={item.id}
                    item={item}
                    isZh={isZh}
                    busy={busy && activeTarget === item.id}
                    disabled={disabled || busy}
                    onClick={() => handlePick(item.id)}
                  />
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={buttonRef}
        type="button"
        title={hint}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        data-opencut-tour="header-export-video"
        onClick={() => {
          if (disabled || busy) return;
          if (open) setOpen(false);
          else openMenu();
        }}
        className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#12141c] px-3.5 text-sm font-semibold text-[#c6f24b] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Spinner className="h-3.5 w-3.5" /> : <DownloadArrowIcon />}
        <span>{label}</span>
        <ChevronDownIcon open={open} />
      </button>
      {megaMenu}
    </div>
  );
}

function MegaMenuCard({
  item,
  isZh,
  busy,
  disabled,
  highlight,
  onClick,
}: {
  item: ExportShareTargetSpec;
  isZh: boolean;
  busy: boolean;
  disabled: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`group flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        highlight
          ? "border-[#12141c]/25 bg-[#f8f9fa] hover:border-[#12141c] hover:bg-[#c6f24b]/20"
          : "border-[#12141c]/12 bg-white hover:border-[#12141c]/40 hover:bg-[#f4f4f6]"
      }`}
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
        {busy ? <Spinner className="h-4 w-4 text-[#12141c]" /> : <TargetBrandIcon id={item.id} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-bold text-[#12141c]">
            {isZh ? item.titleZh : item.titleEn}
          </span>
          {item.badge ? (
            <span className="shrink-0 rounded-full bg-[#12141c] px-1.5 py-0.2 text-[9px] font-bold text-[#c6f24b]">
              {item.badge}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-3.5 text-[#5c6170]">
          {isZh ? item.subtitleZh : item.subtitleEn}
        </p>
      </div>
    </button>
  );
}

function DownloadArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
      <path d="M8 2.5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M5.2 7.2 8 10l2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 13h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4.5 6.5 3.5 3.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrandSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
      {children}
    </svg>
  );
}

function TargetBrandIcon({ id }: { id: ExportShareTargetId }) {
  if (id === "download") {
    return (
      <BrandSvg>
        <rect width="24" height="24" rx="6" fill="#12141c" />
        <path
          d="M12 6v8m0 0-3.5-3.5M12 14l3.5-3.5M6.5 17.5h11"
          stroke="#c6f24b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </BrandSvg>
    );
  }
  if (id === "whatsapp") {
    return (
      <BrandSvg>
        <rect width="24" height="24" rx="6" fill="#25D366" />
        <path
          fill="white"
          d="M12 5.2a6.7 6.7 0 0 0-5.8 10.1L5.3 19l3.8-1a6.7 6.7 0 1 0 2.9-12.8zm3.9 9.5c-.17.47-.98.9-1.37.95-.36.05-.8.08-1.3-.08-.3-.1-.68-.22-1.17-.43-2.06-.89-3.4-2.97-3.5-3.1-.1-.14-.84-1.12-.84-2.14 0-1.02.53-1.52.72-1.73.19-.2.41-.25.55-.25h.4c.13 0 .3-.05.47.36.17.41.58 1.42.63 1.52.05.1.08.22.02.36-.07.14-.1.22-.2.34-.1.12-.21.26-.3.35-.1.1-.2.21-.09.4.12.2.52.86 1.12 1.39.77.68 1.41.9 1.61 1 .2.1.32.08.44-.05.12-.14.5-.58.64-.78.13-.2.27-.17.45-.1.19.07 1.18.56 1.38.66.2.1.34.15.39.24.05.08.05.48-.12.95z"
        />
      </BrandSvg>
    );
  }
  if (id === "native_share") {
    return (
      <BrandSvg>
        <rect width="24" height="24" rx="6" fill="#3B82F6" />
        <path
          d="M12 5.5v9m0-9-3 3m3-3 3 3M7.5 13.5v4a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-4"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </BrandSvg>
    );
  }
  if (id === "instagram_reel" || id === "instagram_story" || id === "instagram_post") {
    const gradId = `ig-mega-${id}`;
    return (
      <BrandSvg>
        <defs>
          <linearGradient id={gradId} x1="3" y1="21" x2="21" y2="3">
            <stop stopColor="#F58529" />
            <stop offset="0.45" stopColor="#DD2A7B" />
            <stop offset="1" stopColor="#515BD4" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill={`url(#${gradId})`} />
        {id === "instagram_reel" ? (
          <>
            <rect
              x="5.5"
              y="5.5"
              width="13"
              height="13"
              rx="3"
              fill="none"
              stroke="white"
              strokeWidth="1.6"
            />
            <path d="M5.5 9.5h13M9.5 5.5l2 4M13.5 5.5l2 4" stroke="white" strokeWidth="1.4" />
            <path d="m10.5 11.8 4 2.2-4 2.2v-4.4Z" fill="white" />
          </>
        ) : id === "instagram_story" ? (
          <>
            <circle
              cx="12"
              cy="12"
              r="6.2"
              fill="none"
              stroke="white"
              strokeWidth="1.7"
              strokeDasharray="3 1.8"
            />
            <path d="M12 9v6M9 12h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : (
          <>
            <rect
              x="5.5"
              y="5.5"
              width="13"
              height="13"
              rx="3.5"
              fill="none"
              stroke="white"
              strokeWidth="1.7"
            />
            <circle cx="12" cy="12" r="3.2" fill="none" stroke="white" strokeWidth="1.7" />
            <circle cx="16.2" cy="7.8" r="1" fill="white" />
          </>
        )}
      </BrandSvg>
    );
  }
  if (id === "tiktok") {
    return (
      <BrandSvg>
        <rect width="24" height="24" rx="6" fill="#111111" />
        <path
          fill="#25F4EE"
          d="M16.3 7.2c.7.7 1.6 1.2 2.6 1.4V11c-1.1-.03-2.2-.38-3.1-1v5.1c0 2.4-1.9 4.3-4.4 4.3S7 17.5 7 15.1s1.9-4.3 4.4-4.3c.3 0 .5 0 .8.1v2.5c-.2-.1-.5-.1-.8-.1-1.1 0-1.9.9-1.9 1.9s.9 1.9 1.9 1.9 1.9-.9 1.9-1.9V6h2.5c.1.4.18.85.5 1.2z"
        />
        <path
          fill="white"
          d="M15.8 7.6c.7.7 1.6 1.2 2.6 1.4V10c-.95-.03-1.85-.32-2.6-.82V15c0 2.4-1.9 4.3-4.4 4.3S7 17.4 7 15s1.9-4.3 4.4-4.3c.25 0 .5 0 .73.07v2.35A1.9 1.9 0 0 0 11.4 13c-1.1 0-1.9.85-1.9 1.9s.85 1.9 1.9 1.9 1.9-.85 1.9-1.9V6.2h2.5c.07.48.2.93.5 1.4z"
        />
      </BrandSvg>
    );
  }
  if (id === "youtube_shorts") {
    return (
      <BrandSvg>
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <path fill="white" d="M10 8.5 16.2 12 10 15.5V8.5z" />
      </BrandSvg>
    );
  }
  if (id === "threads") {
    return (
      <BrandSvg>
        <rect width="24" height="24" rx="6" fill="#111111" />
        <path
          d="M15.8 11.5c-.2-2.2-1.6-3.4-3.7-3.4-2.5 0-4.3 1.9-4.3 4.5 0 2.7 1.8 4.4 4.5 4.4 1.8 0 3.2-.7 3.9-1.9m-1.4-2.6c.1 1.6-.8 2.6-2.2 2.6-1.2 0-2-.7-2-1.7 0-1.1.9-1.8 2.3-1.8.8 0 1.4.2 1.9.5"
          stroke="white"
          strokeWidth="1.7"
          strokeLinecap="round"
          fill="none"
        />
      </BrandSvg>
    );
  }
  if (id === "facebook") {
    return (
      <BrandSvg>
        <rect width="24" height="24" rx="6" fill="#1877F2" />
        <path
          fill="white"
          d="M15.7 8.4h-2c-.4 0-.7.3-.7.8v1.6h2.6l-.4 2.5h-2.2V20h-2.7v-6.7H8.7v-2.5h1.6V9.5c0-1.9 1.2-3.5 3.4-3.5.8 0 1.6.1 1.6.1v2.3h-.6z"
        />
      </BrandSvg>
    );
  }
  if (id === "xiaohongshu") {
    return (
      <BrandSvg>
        <rect width="24" height="24" rx="6" fill="#FF2442" />
        <text
          x="12"
          y="15.2"
          textAnchor="middle"
          fill="white"
          fontSize="7.5"
          fontWeight="800"
          fontFamily="sans-serif"
        >
          小紅書
        </text>
      </BrandSvg>
    );
  }
  return (
    <BrandSvg>
      <rect width="24" height="24" rx="6" fill="#111111" />
      <path
        fill="white"
        d="M16.7 6.5h2.1l-4.6 5.2 5.4 7.8h-4.2l-3.3-4.7-3.8 4.7H6.2l4.9-5.6L5.9 6.5h4.3l3 4.3 3.5-4.3zm-.7 11.6h1.2L8.1 7.7H6.8l9.2 10.4z"
      />
    </BrandSvg>
  );
}
