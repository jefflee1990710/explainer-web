"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { StylePickerOption } from "@/presentation/components/style-picker-option";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import type { StyleId } from "@/model/style-id";
import { localizedStyleName } from "@/util/style-i18n";

function styleLabel(style: PublicStyle): string {
  return style.isCustom ? style.name : localizedStyleName(style.id as StyleId);
}

// Searchable grid for picking a visual style. Sits above any dialog that opened it.
export function StyleSelectDialog({
  styles,
  selectedIds,
  maxSelect,
  isMulti,
  onPick,
  onClose,
}: {
  styles: PublicStyle[];
  selectedIds: string[];
  maxSelect: number;
  isMulti: boolean;
  onPick: (id: PublicStyle["id"]) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return styles;
    return styles.filter((style) => {
      const haystack = [styleLabel(style), style.name, style.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [styles, normalizedQuery]);

  const grouped = styles.some((style) => style.isCustom);
  const systemStyles = filtered.filter((style) => !style.isCustom);
  const mineStyles = filtered.filter((style) => style.isCustom);

  function renderGroup(label: string | null, rows: PublicStyle[]) {
    if (rows.length === 0) return null;
    return (
      <section aria-label={label ?? t("styles.label")}>
        {label ? (
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">
            {label}
          </h3>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map((style) => {
            const orderIndex = selectedIds.indexOf(style.id);
            const active = orderIndex !== -1;
            const name =
              isMulti && active
                ? `#${orderIndex + 1} ${styleLabel(style)}`
                : styleLabel(style);
            return (
              <StylePickerOption
                key={style.id}
                style={style}
                name={name}
                active={active}
                badge={active ? t("styles.selectedBadge") : undefined}
                onPick={onPick}
              />
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/50 p-4"
      onClick={onClose}
      zIndex={140}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {t("styles.dialogTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-muted">{t("styles.dialogSubtitle")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/app/styles"
              className="inline-flex h-8 items-center rounded-full border border-accent-ink/20 bg-white px-3 text-xs font-bold text-foreground transition hover:border-accent-ink hover:bg-lime/25"
            >
              ＋ {t("styles.mineSection")}
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b border-accent-ink/10 bg-paper/80 px-6 py-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("styles.searchPlaceholder")}
            aria-label={t("styles.searchPlaceholder")}
            autoFocus
            className="h-10 w-full rounded-full border border-accent-ink/20 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              {t("styles.noSearchMatch", { query: query.trim() })}
            </p>
          ) : grouped ? (
            <>
              {renderGroup(t("styles.systemSection"), systemStyles)}
              {renderGroup(t("styles.mineSection"), mineStyles)}
            </>
          ) : (
            renderGroup(null, filtered)
          )}
        </div>

        {isMulti ? (
          <div className="flex shrink-0 justify-end border-t border-accent-ink/15 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full bg-accent-ink px-5 py-2.5 text-xs font-bold text-paper transition hover:opacity-90"
            >
              {t("styles.doneButton")} ({selectedIds.length}/{maxSelect})
            </button>
          </div>
        ) : null}
      </div>
    </DialogBackdrop>
  );
}
