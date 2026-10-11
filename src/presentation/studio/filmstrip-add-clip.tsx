"use client";

import type { AspectRatio } from "@/model/project";
import { useI18n } from "@/presentation/components/i18n-provider";

const ASPECT_WIDTH_RATIO: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
};

// Sits to the right of the last clip and opens the add-clip dialog.
export function FilmstripAddClip({
  aspectRatio,
  onAdd,
}: {
  aspectRatio: AspectRatio;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  return (
    <li className="h-full">
      <button
        type="button"
        aria-label={t("production.filmstrip.addClipAria")}
        onClick={onAdd}
        style={{
          width: `calc((var(--filmstrip-h) - 35px) * ${ASPECT_WIDTH_RATIO[aspectRatio]})`,
        }}
        className="grid h-full cursor-pointer place-items-center rounded-sm border border-dashed border-[var(--studio-line)] bg-white text-[var(--studio-muted)] transition hover:border-[var(--studio-ink)] hover:text-[var(--studio-ink)]"
      >
        <span className="text-3xl font-semibold leading-none">+</span>
        <span className="mt-1 px-1 text-[10px] font-semibold">{t("production.filmstrip.addClip")}</span>
      </button>
    </li>
  );
}
