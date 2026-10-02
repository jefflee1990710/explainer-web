"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { SkillGuideRows } from "@/presentation/components/app/projects/[id]/skill-guide-rows";
import type { PublicSkill } from "@/presentation/serialize";
import { localizedVideoType } from "@/util/video-type-i18n";

// Director (video type) dropdown for the create form: system directors, then the user's own.
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

  const system = skills.filter((skill) => !skill.isCustom);
  const mine = skills.filter((skill) => skill.isCustom);
  const selected = skills.find((skill) => skill.slug === value);
  const systemName = (skill: PublicSkill) => localizedVideoType(t, skill.slug, skill.title);

  // Custom: template badge. System: the other language under the locale name.
  let subtitle = "";
  if (selected?.isCustom) {
    const template = system.find((skill) => skill.slug === selected.behaviorSlug);
    const templateName = localizedVideoType(t, selected.behaviorSlug, template?.title || selected.behaviorSlug);
    subtitle = t("directors.templateBadge", { name: templateName });
  } else if (selected) {
    const name = systemName(selected);
    const translation = name === selected.title ? selected.titleZh : selected.title;
    subtitle = translation && translation !== name ? translation : "";
  }

  return (
    <div className="space-y-3">
      <select
        aria-label={t("brief.skill.aria")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="min-h-[44px] w-full cursor-pointer rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {selected ? null : <option value="" disabled />}
        <optgroup label={t("directors.systemSection")}>
          {system.map((skill) => (
            <option key={skill.slug} value={skill.slug}>
              {systemName(skill)}
            </option>
          ))}
        </optgroup>
        {mine.length > 0 ? (
          <optgroup label={t("directors.mineSection")}>
            {mine.map((skill) => (
              <option key={skill.slug} value={skill.slug}>
                {skill.title}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {subtitle ? <p className="px-4 text-xs text-muted">{subtitle}</p> : null}
      {selected ? <SkillGuideRows slug={selected.behaviorSlug} /> : null}
    </div>
  );
}
