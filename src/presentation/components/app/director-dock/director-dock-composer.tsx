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
    <div className="relative mt-2.5 w-full max-w-4xl">
      {/* Left Floating Vertical Mode Rail (matches 图像 / 视频 pill on the left of the screenshot) */}
      {modeItems.length > 0 ? (
        <div
          role="tablist"
          aria-label="Creation mode"
          className="mb-2.5 inline-flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-[#181920]/95 p-1.5 shadow-xl lg:absolute lg:top-1/2 lg:-left-[68px] lg:mb-0 lg:-translate-y-1/2 lg:flex-col"
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
                className={`director-dock-cell flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition lg:w-12 lg:flex-col lg:gap-1 lg:px-1.5 lg:py-2.5 ${
                  active
                    ? "bg-[#2a2d37] text-white shadow-inner"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Main Dark Composer Box */}
      <div
        data-tour-id={tourId}
        className="relative flex w-full flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#181920]/95 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-md"
      >
        {topMediaSlot ? <div className="w-full">{topMediaSlot}</div> : null}

        <div className="flex flex-col items-stretch gap-3 md:flex-row">
          {/* Left column: Borderless Prompt Textarea + Bottom Pill Toolbar */}
          <div className="flex min-h-[96px] min-w-0 flex-1 flex-col justify-between gap-2.5">
            <textarea
              rows={2}
              value={promptValue}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={disabled}
              placeholder={promptPlaceholder}
              className="director-dock-textarea min-h-[54px] w-full resize-none border-0 bg-transparent px-1 py-0.5 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-60"
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
                    className="director-dock-cell inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-[#23252e] text-sm font-bold text-zinc-200 transition hover:border-white/25 hover:bg-[#2c2f3a] hover:text-white disabled:opacity-50"
                  >
                    +
                  </button>
                  {plusMenuOpen && plusMenuSlot ? (
                    <div className="absolute bottom-10 left-0 z-40 min-w-[260px] rounded-2xl border border-white/15 bg-[#1e2029] p-3 text-zinc-100 shadow-2xl">
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
              className="director-dock-generate flex min-h-[86px] w-28 sm:w-32 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl bg-[#d8ff3e] px-4 py-3 font-display text-sm font-extrabold text-[#111318] transition hover:bg-[#e3ff66] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {generating ? (
                <Spinner className="h-4 w-4 text-[#111318]" />
              ) : null}
              <span className="text-sm font-extrabold tracking-tight">
                {generateLabel}
              </span>
              {creditBadge !== undefined && creditBadge !== "" ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#111318]/85">
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
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300"
          >
            {error}
          </p>
        ) : null}

        {footerNotice ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
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
      className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#23252e] px-3 text-xs font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-[#2c2f3a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {accentBadge ? (
        <span className="flex items-center text-[#d8ff3e]">{accentBadge}</span>
      ) : null}
      {icon ? <span className="flex items-center text-zinc-400">{icon}</span> : null}
      <span className="max-w-[160px] truncate">{label}</span>
      {hasChevron ? (
        <svg
          aria-hidden
          className="h-3 w-3 text-zinc-400"
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
  return (
    <div className="relative flex">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={title || label}
        className={`director-dock-tile group relative flex min-h-[86px] w-[78px] sm:w-[86px] shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-2.5 text-left transition ${
          active || thumbUrl || videoUrl
            ? "border-[#d8ff3e]/50 bg-[#252833]"
            : "border-white/[0.08] bg-[#22242c] hover:border-white/25 hover:bg-[#292c36]"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {thumbUrl ? (
          <>
            <img
              src={thumbUrl}
              alt={label}
              className="absolute inset-0 h-full w-full object-cover opacity-75 transition group-hover:opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/25" />
          </>
        ) : videoUrl ? (
          <>
            <video
              src={videoUrl}
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/25" />
          </>
        ) : null}

        <div className="relative z-10 flex w-full items-center justify-between gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xs font-bold text-zinc-200">
            {icon || "+"}
          </span>
          {badge ? (
            <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-semibold text-zinc-300 backdrop-blur-xs">
              {badge}
            </span>
          ) : null}
        </div>

        <span className="relative z-10 block truncate text-[11px] font-bold text-zinc-100">
          {label}
        </span>
      </button>

      {onClear && (thumbUrl || videoUrl) ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={`Clear ${label}`}
          className="absolute -top-1.5 -right-1.5 z-20 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/85 text-[10px] font-bold text-white hover:bg-red-500"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
