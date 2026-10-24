"use client";

import type { LookFilterTag } from "@/service/character/look-tags";
import { useI18n } from "@/presentation/components/i18n-provider";

// Multi-select tag chips for the wardrobe / hair look dialog.
export function LookTagFilterChips({
  tags,
  selected,
  onToggle,
}: {
  tags: readonly LookFilterTag[];
  selected: readonly string[];
  onToggle: (tag: LookFilterTag) => void;
}) {
  const { t } = useI18n();
  if (!tags.length) return null;
  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("characters.look.tagsLabel")}>
      {tags.map((tag) => {
        const active = selectedSet.has(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(tag)}
            className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition ${
              active
                ? "bg-lime text-accent-ink"
                : "border border-accent-ink/15 bg-paper text-muted hover:border-accent-ink/40 hover:text-foreground"
            }`}
          >
            {t(`characters.look.tags.${tag}`)}
          </button>
        );
      })}
    </div>
  );
}
