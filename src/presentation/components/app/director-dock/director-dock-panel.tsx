"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";

export function DirectorDockPanel({
  title,
  defaultOpen = true,
  tourId,
  headerRight,
  children,
}: {
  title?: string;
  defaultOpen?: boolean;
  tourId?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(defaultOpen);

  const panelTitle =
    title ||
    (locale === "zh-Hant"
      ? "導演面板"
      : locale === "zh-Hans"
        ? "导演面板"
        : "Director Panel");

  return (
    <div
      data-tour-id={tourId}
      className="w-full max-w-4xl rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-2.5 shadow-[0_8px_28px_rgba(18,20,28,0.06)]"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-zinc-600 transition hover:text-[#12141c]"
        >
          <svg
            aria-hidden
            className="h-3.5 w-3.5 text-zinc-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="18" rx="3" />
            <path d="M2 8h20" />
            <path d="M7 3v5" />
            <path d="M13 3v5" />
          </svg>
          <span>{panelTitle}</span>
        </button>

        <div className="flex items-center gap-2">
          {headerRight}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Collapse director panel" : "Expand director panel"}
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-[#12141c]"
          >
            <svg
              aria-hidden
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                open ? "rotate-0" : "-rotate-90"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DirectorDockDivider() {
  return <div aria-hidden className="hidden h-8 w-px shrink-0 bg-zinc-200 lg:block" />;
}

export function DirectorDockCastGroup({
  slots,
  onOpenPicker,
  onManageActive,
  disabled,
  tourId,
  badgeLabel,
}: {
  slots: Array<{
    index: number;
    character: { id: string; name: string; previewUrl?: string } | null;
  }>;
  onOpenPicker: () => void;
  onManageActive?: () => void;
  disabled?: boolean;
  tourId?: string;
  badgeLabel?: string;
}) {
  return (
    <div
      data-tour-id={tourId}
      className="flex shrink-0 items-center gap-1.5"
    >
      {/* Person + add icon slot matching printscreen */}
      <button
        type="button"
        disabled={disabled}
        onClick={onOpenPicker}
        title={badgeLabel}
        className="director-dock-cell inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-[#f4f4f5] text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-200/70 hover:text-[#12141c] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          aria-hidden
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      </button>

      {slots.map((slot) => {
        const char = slot.character;
        return (
          <button
            key={slot.index}
            type="button"
            disabled={disabled}
            onClick={char && onManageActive ? onManageActive : onOpenPicker}
            title={char ? char.name : badgeLabel}
            className="director-dock-cell group relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-200 bg-[#f4f4f5] transition hover:border-zinc-400 hover:bg-zinc-200/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {char?.previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={char.previewUrl}
                  alt={char.name}
                  className="h-full w-full object-cover object-top"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-[9px] font-semibold text-white">
                  {char.name}
                </span>
              </>
            ) : char ? (
              <span className="flex h-full w-full items-center justify-center px-1 text-[10px] font-bold text-[#12141c]">
                {char.name.slice(0, 3)}
              </span>
            ) : (
              <span className="flex h-full w-full items-center justify-center text-zinc-400 group-hover:text-zinc-600">
                +
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DirectorDockStepperCell({
  thumbUrl,
  icon,
  label,
  value,
  onPrev,
  onNext,
  onClick,
  disabled,
  tourId,
}: {
  thumbUrl?: string;
  icon?: ReactNode;
  label: string;
  value: string;
  onPrev?: () => void;
  onNext?: () => void;
  onClick?: () => void;
  disabled?: boolean;
  tourId?: string;
}) {
  return (
    <div
      data-tour-id={tourId}
      className="flex h-12 min-w-[132px] flex-1 items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-[#f4f4f5] px-2.5 transition hover:border-zinc-300"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="director-dock-cell flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt={value}
            className="h-8 w-8 shrink-0 rounded-lg border border-zinc-200 bg-white object-cover"
          />
        ) : icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-700">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-medium text-zinc-500">
            {label}
          </span>
          <span className="block truncate text-xs font-bold text-[#12141c]">
            {value}
          </span>
        </div>
      </button>

      {onPrev || onNext ? (
        <div className="flex flex-col items-center justify-center gap-0.5 text-zinc-500">
          <button
            type="button"
            disabled={disabled}
            onClick={onPrev}
            aria-label={`Previous ${label}`}
            className="cursor-pointer rounded p-0.5 hover:bg-zinc-200 hover:text-[#12141c] disabled:opacity-40"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7l-6 6h12z" />
            </svg>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onNext}
            aria-label={`Next ${label}`}
            className="cursor-pointer rounded p-0.5 hover:bg-zinc-200 hover:text-[#12141c] disabled:opacity-40"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17l6-6H6z" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DirectorDockCurveCell({
  label,
  value,
  onPrev,
  onNext,
  onClick,
  disabled,
  tourId,
}: {
  label: string;
  value: string;
  onPrev?: () => void;
  onNext?: () => void;
  onClick?: () => void;
  disabled?: boolean;
  tourId?: string;
}) {
  return (
    <div
      data-tour-id={tourId}
      className="flex h-12 min-w-[172px] flex-[1.2] items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-[#f4f4f5] px-2.5 transition hover:border-zinc-300"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="director-dock-cell flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* Blue bezier speed/pace curve matching the reference screenshot */}
        <div className="flex h-8 w-20 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-white px-1.5">
          <svg
            aria-hidden
            viewBox="0 0 96 28"
            className="h-6 w-full overflow-visible"
            fill="none"
          >
            <line
              x1="4"
              y1="14"
              x2="92"
              y2="14"
              stroke="rgba(18,20,28,0.12)"
              strokeWidth="1"
            />
            <path
              d="M 8 10 C 24 10, 32 21, 48 20 C 64 19, 72 9, 88 9"
              stroke="#0284c7"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="8" cy="10" r="3" fill="#0284c7" />
            <circle cx="48" cy="20" r="3" fill="#0284c7" />
            <circle cx="70" cy="10" r="3" fill="#0284c7" />
            <circle cx="88" cy="9" r="3" fill="#0284c7" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-medium text-zinc-500">
            {label}
          </span>
          <span className="block truncate text-xs font-bold text-[#12141c]">
            {value}
          </span>
        </div>
      </button>

      {onPrev || onNext ? (
        <div className="flex flex-col items-center justify-center gap-0.5 text-zinc-500">
          <button
            type="button"
            disabled={disabled}
            onClick={onPrev}
            aria-label={`Previous ${label}`}
            className="cursor-pointer rounded p-0.5 hover:bg-zinc-200 hover:text-[#12141c] disabled:opacity-40"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7l-6 6h12z" />
            </svg>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onNext}
            aria-label={`Next ${label}`}
            className="cursor-pointer rounded p-0.5 hover:bg-zinc-200 hover:text-[#12141c] disabled:opacity-40"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17l6-6H6z" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DirectorDockDurationCell({
  label,
  value,
  onClick,
  disabled,
  tourId,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  disabled?: boolean;
  tourId?: string;
}) {
  return (
    <button
      type="button"
      data-tour-id={tourId}
      disabled={disabled}
      onClick={onClick}
      className="director-dock-cell flex h-12 min-w-[96px] shrink-0 cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-zinc-200 bg-[#f4f4f5] px-3 text-left transition hover:border-zinc-300 hover:bg-zinc-200/70 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="min-w-0">
        <span className="block truncate text-[10px] font-medium text-zinc-500">
          {label}
        </span>
        <span className="block truncate text-xs font-bold text-[#12141c]">
          {value}
        </span>
      </div>
      {/* Vertical bar indicator matching the screenshot's duration control */}
      <div className="flex items-center gap-1.5">
        <span className="h-6 w-1 rounded-full bg-[#12141c]" />
      </div>
    </button>
  );
}
