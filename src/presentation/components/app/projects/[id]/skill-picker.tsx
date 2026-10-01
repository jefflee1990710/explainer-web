"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { SkillGuideRows } from "@/presentation/components/app/projects/[id]/skill-guide-rows";
import type { PublicSkill } from "@/presentation/serialize";
import { localizedVideoType } from "@/util/video-type-i18n";

// Video-type (narrative skill) chips for the create form; skill is per video, not per folder.
export function SkillPicker({
  skills,
  value,
  onChange,
  disabled,
}: {
  skills: PublicSkill[];
  value: string;
  onChange: (slug: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  if (skills.length === 0) {
    return <p className="text-sm text-muted">{t("brief.skill.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      {value ? <SkillGuideRows slug={value} /> : null}
      <div role="radiogroup" aria-label={t("brief.skill.aria")} className="grid gap-2 sm:grid-cols-2">
        {skills.map((skill) => {
          const active = skill.slug === value;
          const name = localizedVideoType(t, skill.slug, skill.title);
          // The other language sits under the locale name so both stay visible.
          const translation = name === skill.title ? skill.titleZh : skill.title;
          return (
            <motion.button
              key={skill.slug}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(skill.slug)}
              whileTap={{ scale: 0.98 }}
              className={`flex min-h-[52px] cursor-pointer flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-accent-ink bg-accent-ink text-paper"
                  : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
              }`}
            >
              <span className="text-sm font-semibold">{name}</span>
              {translation && translation !== name ? (
                <span className={`mt-0.5 text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                  {translation}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
