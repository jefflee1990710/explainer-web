"use client";

import type { ReactNode } from "react";
import { Spinner } from "@/presentation/components/spinner";

export interface DirectorDockModeItem {
  id: string;
  label: string;
  icon: ReactNode;
}

export function DirectorDockComposer({
  modeItems = [],
  activeModeId,
  onSelectMode,
  promptValue,
  onPromptChange,
  promptPlaceholder,
  topMediaSlot,
  plusMenuOpen,
  onPlusToggle,
  plusMenuSlot,
  pills,
  rightSlot1,
  rightSlot2,
  onGenerate,
  generateType = "button",
  generateDisabled,
  generating,
  generateLabel = "生成",
  creditBadge,
  error,
  footerNotice,
  tourId,
  disabled,
}: {
  modeItems?: readonly DirectorDockModeItem[];
  activeModeId?: string;
  onSelectMode?: (id: string) => void;
  promptValue: string;
  onPromptChange: (value: string) => void;
  promptPlaceholder: string;
  topMediaSlot?: ReactNode;
  plusMenuOpen?: boolean;
  onPlusToggle?: () => void;
  plusMenuSlot?: ReactNode;
  pills?: ReactNode;
  rightSlot1?: ReactNode;
  rightSlot2?: ReactNode;
  onGenerate?: () => void;
  generateType?: "button" | "submit";
  generateDisabled?: boolean;
  generating?: boolean;
  generateLabel?: string;
  creditBadge?: string | number;
  error?: string;
  footerNotice?: ReactNode;
  tourId?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-2.5 flex w-full max-w-4xl flex-col gap-2.5 md:flex-row md:items-center">
      {/* Left Vertical Mode Rail (sits inside the max-w-4xl flex row so it never overflows left or pushes the right side off-screen) */}
      {modeItems.length > 0 ? (
        <div
          role="tablist"
          aria-label="Creation mode"
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-2xl border border-zinc-200/90 bg-white p-1.5 shadow-[0_8px_24px_rgba(18,20,28,0.06)] md:self-center md:flex-col"
        >
          {modeItems.map((item) => {
            const active = item.id === activeModeId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => onSelectMode?.(item.id)}
                className={`director-dock-cell flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition md:w-12 md:flex-col md:gap-1 md:px-1.5 md:py-2.5 ${
                  active
                    ? "bg-[#12141c] text-[#c6f24b] shadow-xs"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-[#12141c]"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Main Light Composer Box */}
      <div
        data-tour-id={tourId}
        className="relative flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-[0_12px_36px_rgba(18,20,28,0.07)]"
      >
        {topMediaSlot ? <div className="w-full">{topMediaSlot}</div> : null}

        <div className="flex flex-col items-stretch gap-3 sm:flex-row">
          {/* Left column: Borderless Prompt Textarea + Bottom Pill Toolbar */}
          <div className="flex min-h-[92px] min-w-0 flex-1 flex-col justify-between gap-2.5">
            <textarea
              rows={2}
              value={promptValue}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={disabled}
              placeholder={promptPlaceholder}
              className="director-dock-textarea min-h-[52px] w-full resize-none border-0 bg-transparent px-1 py-0.5 text-sm leading-6 text-[#12141c] placeholder:text-zinc-400 focus:outline-none disabled:opacity-60"
            />

            {/* Bottom-left pill toolbar */}
            <div className="relative flex flex-wrap items-center gap-1.5">
              {onPlusToggle ? (
                <div className="relative">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onPlusToggle}
                    aria-label="More options and samples"
                    className="director-dock-cell inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-[#f4f4f5] text-sm font-bold text-[#12141c] transition hover:border-zinc-400 hover:bg-zinc-200/70 disabled:opacity-50"
                  >
                    +
                  </button>
                  {plusMenuOpen && plusMenuSlot ? (
                    <div className="absolute bottom-10 left-0 z-40 min-w-[260px] rounded-2xl border border-zinc-200 bg-white p-3 text-[#12141c] shadow-2xl">
                      {plusMenuSlot}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {pills}
            </div>
          </div>

          {/* Right cluster: Two Quick Tiles + Lime Generate Button */}
          <div className="flex shrink-0 items-stretch gap-2">
            {rightSlot1}
            {rightSlot2}

            <button
              type={generateType}
              disabled={generateDisabled || generating}
              onClick={generateType === "button" ? onGenerate : undefined}
              className="director-dock-generate flex min-h-[84px] w-26 sm:w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl bg-[#c6f24b] px-3.5 py-3 font-display text-sm font-extrabold text-[#12141c] transition hover:bg-[#b6e23a] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {generating ? (
                <Spinner className="h-4 w-4 text-[#12141c]" />
              ) : null}
              <span className="text-sm font-extrabold tracking-tight">
                {generateLabel}
              </span>
              {creditBadge !== undefined && creditBadge !== "" ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#12141c]/80">
                  <span>✦</span>
                  <span>{creditBadge}</span>
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
          >
            {error}
          </p>
        ) : null}

        {footerNotice ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            {footerNotice}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DirectorDockPill({
  icon,
  accentBadge,
  label,
  hasChevron = false,
  onClick,
  disabled,
  tourId,
  title,
}: {
  icon?: ReactNode;
  accentBadge?: ReactNode;
  label: string;
  hasChevron?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  tourId?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      data-tour-id={tourId}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-[#f4f4f5] px-3 text-xs font-semibold text-[#12141c] transition hover:border-zinc-400 hover:bg-zinc-200/70 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {accentBadge ? (
        <span className="flex items-center rounded bg-[#12141c] px-1 py-0.5 text-[10px] font-bold text-[#c6f24b]">
          {accentBadge}
        </span>
      ) : null}
      {icon ? <span className="flex items-center text-zinc-500">{icon}</span> : null}
      <span className="max-w-[145px] truncate">{label}</span>
      {hasChevron ? (
        <svg
          aria-hidden
          className="h-3 w-3 text-zinc-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      ) : null}
    </button>
  );
}

export function DirectorDockQuickTile({
  label,
  badge,
  thumbUrl,
  videoUrl,
  active,
  icon,
  onClick,
  onClear,
  disabled,
  title,
}: {
  label: string;
  badge?: string;
  thumbUrl?: string;
  videoUrl?: string;
  active?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const hasMedia = Boolean(thumbUrl || videoUrl);
  return (
    <div className="relative flex">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={title || label}
        className={`director-dock-tile group relative flex min-h-[84px] w-[74px] sm:w-[80px] shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-2 text-left transition ${
          active || hasMedia
            ? "border-[#12141c] bg-zinc-100"
            : "border-zinc-200 bg-[#f4f4f5] hover:border-zinc-400 hover:bg-zinc-200/60"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {thumbUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl}
              alt={label}
              className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/15" />
          </>
        ) : videoUrl ? (
          <>
            <video
              src={videoUrl}
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/15" />
          </>
        ) : null}

        <div className="relative z-10 flex w-full items-center justify-between gap-1">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${
              hasMedia
                ? "border-white/30 bg-black/50 text-white"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {icon || "+"}
          </span>
          {badge ? (
            <span
              className={`rounded px-1 py-0.5 text-[9px] font-semibold ${
                hasMedia
                  ? "bg-black/55 text-white backdrop-blur-xs"
                  : "bg-zinc-200/90 text-zinc-600"
              }`}
            >
              {badge}
            </span>
          ) : null}
        </div>

        <span
          className={`relative z-10 block truncate text-[11px] font-bold ${
            hasMedia ? "text-white" : "text-[#12141c]"
          }`}
        >
          {label}
        </span>
      </button>

      {onClear && hasMedia ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={`Clear ${label}`}
          className="absolute -top-1.5 -right-1.5 z-20 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-[#12141c] text-[10px] font-bold text-white hover:bg-red-500"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
