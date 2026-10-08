"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SYSTEM_TEXT_STYLE_ORDER, isSubtitleLook, systemTextStylePreview } from "@/service/director/subtitle-look";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicTextStyle } from "@/presentation/serialize";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";

// Lettering only. Where the subtitle sits still comes from the director.
export function TextStylePicker({
  value,
  styles,
  onChange,
  disabled,
  compact,
}: {
  value: string;
  styles: PublicTextStyle[];
  onChange: (id: string) => void;
  disabled?: boolean;
  // Summary row on an existing video. The menu is portaled so the editor cannot clip it.
  compact?: boolean;
}) {
  const { t } = useI18n();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const custom = styles.find((style) => style.id === value);
  const system = isSubtitleLook(value) ? value : null;
  const preset = system ? subtitleLookLabel(t, system) : null;
  const preview = system ? systemTextStylePreview(system) : custom?.imageUrl;
  const label = preset?.label || custom?.name || subtitleLookLabel(t, "handwritten").label;
  const sublabel = preset?.sublabel;

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, compact ? 280 : rect.width);
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      setBox({ top: rect.bottom + 8, left: Math.max(8, left), width });
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    place();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, compact]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${open ? "z-30" : ""}`}>
      <button
        type="button"
        id={`${listboxId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        title={t("brief.section04.lookHint")}
        onClick={() => setOpen((current) => !current)}
        className={
          compact
            ? "flex h-8 max-w-52 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--studio-line)] bg-white px-1.5 text-left text-xs font-semibold text-[var(--studio-ink)] hover:border-[var(--studio-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
            : "flex w-full min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-accent-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {preview ? <Thumb src={preview} compact={compact} /> : <EmptyThumb compact={compact} />}
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold text-foreground ${compact ? "text-xs" : "text-sm"}`}>{label}</span>
          {!compact && sublabel ? <span className="mt-0.5 block truncate text-xs text-muted">{sublabel}</span> : null}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && box
        ? createPortal(
        <ul
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={t("brief.section04.lookAria")}
          style={{ top: box.top, left: box.left, width: box.width }}
          className="fixed z-50 max-h-80 overflow-y-auto rounded-xl border border-accent-ink/15 bg-paper p-1 shadow-[4px_4px_0_0_rgba(18,20,28,0.08)]"
        >
          {SYSTEM_TEXT_STYLE_ORDER.map((id) => {
            const option = subtitleLookLabel(t, id);
            const active = value === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(id)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
                  }`}
                >
                  <Thumb src={systemTextStylePreview(id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{option.label}</span>
                    <span className={`block truncate text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                      {option.sublabel}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {styles.map((style) => {
            const active = value === style.id;
            return (
              <li key={style.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(style.id)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
                  }`}
                >
                  <Thumb src={style.imageUrl} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{style.name}</span>
                </button>
              </li>
            );
          })}
        </ul>,
          document.body,
        )
        : null}
    </div>
  );
}

function Thumb({ src, compact }: { src: string; compact?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={96}
      height={64}
      className={
        compact
          ? "h-6 w-10 shrink-0 rounded border border-accent-ink/10 bg-black object-contain object-center"
          : "h-14 w-24 shrink-0 rounded-md border border-accent-ink/10 bg-black object-contain object-center"
      }
    />
  );
}

function EmptyThumb({ compact }: { compact?: boolean }) {
  return (
    <span
      className={
        compact
          ? "grid h-6 w-10 shrink-0 place-items-center rounded border border-dashed border-accent-ink/15 text-[10px] text-muted"
          : "grid h-14 w-24 shrink-0 place-items-center rounded-md border border-dashed border-accent-ink/15 text-xs text-muted"
      }
    >
      —
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
