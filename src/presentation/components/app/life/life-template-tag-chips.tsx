"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

const LIFE_TEMPLATE_FILTER_TAGS = [
  "athletic",
  "pickleball",
  "yoga",
  "casual",
  "street",
  "cafe",
  "selfie",
  "travel",
  "branding",
] as const;

export type LifeTemplateFilterTag = (typeof LIFE_TEMPLATE_FILTER_TAGS)[number];

export function lifeTemplateFilterTagList() {
  return LIFE_TEMPLATE_FILTER_TAGS;
}

// Multi-select tag chips for the Life post-type dialog.
export function LifeTemplateTagChips({
  available,
  selected,
  onToggle,
}: {
  available: readonly string[];
  selected: readonly string[];
  onToggle: (tag: string) => void;
}) {
  const { t } = useI18n();
  const selectedSet = new Set(selected);
  const chips = LIFE_TEMPLATE_FILTER_TAGS.filter((tag) => available.includes(tag));
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("life.templates.tagsLabel")}>
      {chips.map((tag) => {
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
            {t(`life.templates.tags.${tag}`)}
          </button>
        );
      })}
    </div>
  );
}
