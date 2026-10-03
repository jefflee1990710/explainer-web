"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import type { StyleId } from "@/model/style-id";
import { localizedStyleName } from "@/util/style-i18n";

// System styles use the catalog label. A custom style keeps the name the user wrote.
function styleLabel(style: PublicStyle): string {
  return style.isCustom ? style.name : localizedStyleName(style.id as StyleId);
}

// Left thumbnail for a style row (dropdown trigger or option).
function StylePreviewThumb({
  style,
  label,
  size = "md",
}: {
  style: PublicStyle;
  label: string;
  size?: "md" | "sm";
}) {
  const box = size === "sm" ? "h-14 w-[5.5rem]" : "h-16 w-28";
  return (
    <span
      className={`${box} relative shrink-0 overflow-hidden rounded-md border border-accent-ink/10`}
      style={{ backgroundColor: style.canvasColor }}
    >
      {style.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={style.previewUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center px-0.5 text-center font-display text-[9px] font-bold leading-tight text-accent-ink/60">
          {label}
        </span>
      )}
    </span>
  );
}

// Dropdown of visual styles with a preview thumbnail on the left of each row.
export function StylePicker({
  styles,
  value,
  onChange,
  disabled,
  label,
}: {
  styles: PublicStyle[];
  value: string;
  onChange: (id: PublicStyle["id"]) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  const groupLabel = label ?? t("styles.label");
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = styles.find((item) => item.id === value) ?? styles[0];
  const selectedName = selected ? styleLabel(selected) : groupLabel;
  const selectedDescription = selected?.description || "";
  const grouped = styles.some((style) => style.isCustom);
  const systemStyles = styles.filter((style) => !style.isCustom);
  const mineStyles = styles.filter((style) => style.isCustom);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (styles.length === 0) {
    return <p className="text-sm text-muted">目前沒有可用的視覺風格。</p>;
  }

  function pick(id: PublicStyle["id"]) {
    onChange(id);
    setOpen(false);
  }

  function renderOption(style: PublicStyle) {
    const active = style.id === value;
    const name = styleLabel(style);
    return (
      <li key={style.id} role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={active}
          onClick={() => pick(style.id)}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            active ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
          }`}
        >
          <StylePreviewThumb style={style} label={name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className={`mt-0.5 block truncate text-xs ${active ? "text-paper/75" : "text-muted"}`}>
              {style.description}
            </span>
          </span>
        </button>
      </li>
    );
  }

  // Same section labels as the director picker until styles get their own keys.
  function renderGroup(label: string, rows: PublicStyle[]) {
    if (rows.length === 0) return null;
    return (
      <li role="presentation">
        <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <ul role="group" aria-label={label}>
          {rows.map((style) => renderOption(style))}
        </ul>
      </li>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={`${listboxId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-accent-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {selected ? <StylePreviewThumb style={selected} label={selectedName} /> : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{selectedName}</span>
          {selectedDescription ? (
            <span className="mt-0.5 block truncate text-xs text-muted">{selectedDescription}</span>
          ) : null}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={groupLabel}
          aria-labelledby={`${listboxId}-trigger`}
          className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-accent-ink/15 bg-paper p-1 shadow-[4px_4px_0_0_rgba(18,20,28,0.08)]"
        >
          {grouped ? (
            <>
              {renderGroup(t("directors.systemSection"), systemStyles)}
              {renderGroup(t("directors.mineSection"), mineStyles)}
            </>
          ) : (
            styles.map((style) => renderOption(style))
          )}
        </ul>
      ) : null}
    </div>
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
