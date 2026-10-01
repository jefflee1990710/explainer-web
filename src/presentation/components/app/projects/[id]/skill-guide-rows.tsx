"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { SKILL_GUIDE_FIELDS, skillGuideFor } from "@/presentation/components/app/projects/[id]/skill-guide";

// Selected-skill cheat sheet above the type cards, in the current UI locale.
export function SkillGuideRows({ slug }: { slug: string }) {
  const { t } = useI18n();
  const guide = skillGuideFor(t, slug);
  if (!guide) return null;

  return (
    <dl className="grid gap-1.5 sm:grid-cols-2">
      {SKILL_GUIDE_FIELDS.map((field) => (
        <div key={field.key} className="grid grid-cols-[4.5rem_1fr] gap-2 text-[11px] leading-4">
          <dt className="font-semibold text-muted">{t(field.labelKey)}</dt>
          <dd className="text-foreground/85">{guide[field.key]}</dd>
        </div>
      ))}
    </dl>
  );
}
