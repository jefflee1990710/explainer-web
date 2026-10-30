"use client";

import { useState } from "react";
import { StyleSelectDialog } from "@/presentation/components/style-select-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import type { StyleId } from "@/model/style-id";
import { localizedStyleName } from "@/util/style-i18n";

// System styles use the catalog label. A custom style keeps the name the user wrote.
function styleLabel(style: PublicStyle): string {
  return style.isCustom ? style.name : localizedStyleName(style.id as StyleId);
}

// Selected visual style sits between previous/next. The center opens the picker dialog.
export function StylePicker({
  styles,
  value,
  values,
  maxSelect = 1,
  onChange,
  onMultiChange,
  disabled,
  label,
}: {
  styles: PublicStyle[];
  value: string;
  values?: string[];
  maxSelect?: number;
  onChange: (id: PublicStyle["id"]) => void;
  onMultiChange?: (ids: PublicStyle["id"][]) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  const groupLabel = label ?? t("styles.label");
  const [open, setOpen] = useState(false);

  const isMulti = maxSelect > 1 && Boolean(onMultiChange);
  const selectedIds = isMulti && values && values.length > 0 ? values : [value];
  const foundIndex = styles.findIndex((item) => item.id === value);
  const selected = foundIndex >= 0 ? styles[foundIndex] : undefined;
  const selectedNames = selectedIds
    .map((id) => styles.find((item) => item.id === id))
    .filter((item): item is PublicStyle => Boolean(item))
    .map(styleLabel);
  const selectedName =
    selectedNames.length > 1
      ? `${selectedNames.join(" → ")} (${selectedNames.length}/${maxSelect})`
      : selected
        ? styleLabel(selected)
        : value
          ? value
          : groupLabel;

  function step(delta: number) {
    if (styles.length === 0 || isMulti) return;
    const base = foundIndex >= 0 ? foundIndex : delta > 0 ? -1 : 0;
    const next = (base + delta + styles.length) % styles.length;
    const style = styles[next];
    if (style) onChange(style.id);
  }

  function pick(id: PublicStyle["id"]) {
    if (isMulti && onMultiChange) {
      if (selectedIds.includes(id)) {
        if (selectedIds.length > 1) {
          onMultiChange(selectedIds.filter((item) => item !== id));
        }
      } else if (selectedIds.length < maxSelect) {
        onMultiChange([...selectedIds, id]);
      } else {
        onMultiChange([...selectedIds.slice(0, maxSelect - 1), id]);
      }
      return;
    }
    onChange(id);
    setOpen(false);
  }

  if (styles.length === 0) {
    return <p className="text-sm text-muted">{t("styles.empty")}</p>;
  }

  const arrowClass =
    "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 bg-white text-foreground transition hover:border-accent-ink hover:bg-lime/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div>
      <div className="flex min-h-[4.5rem] items-center gap-2 rounded-xl border border-accent-ink/15 bg-paper/70 px-2 py-2">
        <button
          type="button"
          className={arrowClass}
          aria-label={t("styles.previous")}
          disabled={disabled || isMulti || styles.length < 2}
          onClick={() => step(-1)}
        >
          <ArrowIcon direction="left" />
        </button>
        <button
          type="button"
          aria-label={groupLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-1 py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {selected ? <StyleIcon style={selected} label={styleLabel(selected)} /> : <StyleIconFallback label={selectedName} />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {selectedName}
            </span>
          </span>
        </button>
        <button
          type="button"
          className={arrowClass}
          aria-label={t("styles.next")}
          disabled={disabled || isMulti || styles.length < 2}
          onClick={() => step(1)}
        >
          <ArrowIcon direction="right" />
        </button>
      </div>

      {open ? (
        <StyleSelectDialog
          styles={styles}
          selectedIds={selectedIds}
          maxSelect={maxSelect}
          isMulti={isMulti}
          onPick={pick}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function StyleIcon({ style, label }: { style: PublicStyle; label: string }) {
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-accent-ink/10"
      style={{ backgroundColor: style.canvasColor }}
    >
      {style.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={style.previewUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="px-1 text-center font-display text-[9px] font-bold leading-tight text-accent-ink/60">
          {label.slice(0, 2)}
        </span>
      )}
    </span>
  );
}

function StyleIconFallback({ label }: { label: string }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-accent-ink/10 bg-white">
      <span className="px-1 text-center font-display text-[9px] font-bold leading-tight text-accent-ink/60">
        {label.slice(0, 2)}
      </span>
    </span>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d={direction === "left" ? "M12.5 5L7.5 10L12.5 15" : "M7.5 5L12.5 10L7.5 15"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
