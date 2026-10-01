"use client";

import { useMemo } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicSkill } from "@/presentation/serialize";

// Same order as seed-skills.ts so the filter bar matches the create form.
const SKILL_ORDER = [
  "cartoon-explainer-video-director",
  "story-short-director",
  "product-demo-director",
  "dialogue-qa-director",
  "listicle-director",
  "tutorial-director",
  "opening-director",
  "ending-director",
] as const;

function orderSkills(skills: PublicSkill[]) {
  const rank = new Map(SKILL_ORDER.map((slug, index) => [slug, index]));
  return skills
    .slice()
    .sort(
      (a, b) =>
        (rank.get(a.slug as (typeof SKILL_ORDER)[number]) ?? 99) -
        (rank.get(b.slug as (typeof SKILL_ORDER)[number]) ?? 99),
    );
}

// Folder video list: filter grid by narrative skill (video type).
export function VideoSkillFilter({
  skills,
  value,
  onChange,
}: {
  skills: PublicSkill[];
  value: string;
  onChange: (skillSlug: string) => void;
}) {
  const { t } = useI18n();
  const ordered = useMemo(() => orderSkills(skills), [skills]);

  return (
    <div
      role="group"
      aria-label={t("video.filter.aria")}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
    >
      <FilterChip active={value === ""} onClick={() => onChange("")} primary={t("video.filter.all")} />
      {ordered.map((skill) => (
        <FilterChip
          key={skill.slug}
          active={value === skill.slug}
          onClick={() => onChange(skill.slug)}
          primary={skill.titleZh}
          secondary={skill.title}
        />
      ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  primary,
  secondary,
}: {
  active: boolean;
  onClick: () => void;
  primary: string;
  secondary?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex shrink-0 cursor-pointer flex-col items-start rounded-xl border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? "border-accent-ink bg-accent-ink text-paper"
          : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
      }`}
    >
      <span className="whitespace-nowrap text-xs font-semibold leading-tight">{primary}</span>
      {secondary ? (
        <span className={`whitespace-nowrap text-[11px] leading-tight ${active ? "text-paper/75" : "text-muted"}`}>
          {secondary}
        </span>
      ) : null}
    </button>
  );
}
