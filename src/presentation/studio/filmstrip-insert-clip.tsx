"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Round add control in a filmstrip gap. Opens the add-clip dialog for that slot.
export function FilmstripInsertClip({
  label,
  onAdd,
}: {
  label: string;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  return (
    <li className="flex items-center">
      <button
        type="button"
        aria-label={t("production.filmstrip.addClipAria", { place: label })}
        onClick={onAdd}
        className="studio-insert-clip grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-[var(--studio-line)] bg-white text-[var(--studio-ink)]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 18.5c.6-2.4 2.8-4 5.5-4s4.9 1.6 5.5 4" strokeLinecap="round" />
          <path d="M17 8v6M14 11h6" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
