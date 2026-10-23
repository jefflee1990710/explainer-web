"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { SKILL_GUIDE_FIELDS, skillGuideFor } from "@/presentation/components/app/projects/[id]/skill-guide";

// Selected-skill cheat sheet above the type cards, in the current UI locale.
export function SkillGuideRows({ slug }: { slug: string }) {
  const { t } = useI18n();
  const guide = skillGuideFor(t, slug);
  if (!guide) return null;

  return (
    <dl className="grid h-full items-center gap-x-5 gap-y-2 rounded-xl border border-accent-ink/10 bg-paper/70 px-4 py-3 sm:grid-cols-2">
      {SKILL_GUIDE_FIELDS.map((field) => (
        <div key={field.key} className="grid grid-cols-[4.25rem_1fr] items-baseline gap-2 text-xs leading-5">
          <dt className="font-semibold text-muted">{t(field.labelKey)}</dt>
          <dd className="text-foreground/90">{guide[field.key]}</dd>
        </div>
      ))}
    </dl>
  );
}
