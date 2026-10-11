"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Hover control on a filmstrip card. Opens the delete confirmation.
export function FilmstripDeleteClip({
  title,
  visible,
  onDelete,
}: {
  title: string;
  visible?: boolean;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      data-filmstrip-delete=""
      aria-label={t("production.filmstrip.deleteClip", { title })}
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}
      className={`absolute right-1 top-6 z-20 grid h-6 w-6 cursor-pointer place-items-center rounded-sm bg-white/90 text-sm font-bold leading-none text-[var(--studio-ink)] shadow-sm transition hover:bg-red-600 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      ×
    </button>
  );
}
