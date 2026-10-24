"use client";

import { useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { SkillGuideRows } from "@/presentation/components/app/projects/[id]/skill-guide-rows";
import { SkillSelectDialog } from "@/presentation/components/app/projects/[id]/skill-select-dialog";
import { DirectorPreviewThumb } from "@/presentation/components/director-preview-thumb";
import type { PublicSkill } from "@/presentation/serialize";
import {
  localizedVideoBlurb,
  localizedVideoType,
  localizedVideoUseCase,
} from "@/util/video-type-i18n";

// Clickable trigger that opens the Video Type (Director) Selection Dialog and shows description + suggested use cases below.
export function SkillPicker({
  skills,
  value,
  onChange,
  disabled,
  sideBySideGuide = false,
}: {
  skills: PublicSkill[];
  value: string;
  onChange: (slug: string) => void;
  disabled?: boolean;
  sideBySideGuide?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const system = skills.filter((skill) => !skill.isCustom);
  const selected = skills.find((skill) => skill.slug === value);
  const optionName = (skill: PublicSkill) =>
    skill.isCustom
      ? skill.title
      : localizedVideoType(t, skill.slug, skill.title);
  const selectedLabel = selected
    ? optionName(selected)
    : value
      ? localizedVideoType(t, value, value)
      : t("brief.skill.aria");

  const selectedDescription = selected
    ? selected.isCustom
      ? selected.description
      : localizedVideoBlurb(t, selected.slug, selected.description)
    : "";

  const selectedUseCase = selected
    ? selected.isCustom
      ? selected.suggestedUseCase ||
        localizedVideoUseCase(t, selected.behaviorSlug, "")
      : localizedVideoUseCase(
          t,
          selected.slug,
          selected.suggestedUseCase || "",
        )
    : "";

  let subtitle = "";
  if (selected?.isCustom) {
    const template = system.find(
      (skill) => skill.slug === selected.behaviorSlug,
    );
    const templateName = localizedVideoType(
      t,
      selected.behaviorSlug,
      template?.title || selected.behaviorSlug,
    );
    subtitle = t("directors.templateBadge", { name: templateName });
  } else if (selectedDescription) {
    subtitle = selectedDescription;
  }

  if (skills.length === 0) {
    return <p className="text-sm text-muted">{t("brief.skill.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      <div
        className={
          sideBySideGuide
            ? "grid gap-4 lg:grid-cols-12 lg:items-stretch"
            : "space-y-3"
        }
      >
        <div className={sideBySideGuide ? "lg:col-span-5" : ""}>
          <button
            type="button"
            aria-label={t("brief.skill.aria")}
            aria-haspopup="dialog"
            aria-expanded={open}
            disabled={disabled}
            onClick={() => setOpen(true)}
            className="flex h-full min-h-[4.5rem] w-full cursor-pointer items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-accent-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {selected ? (
              <DirectorPreviewThumb
                previewUrl={selected.previewUrl}
                label={selectedLabel}
              />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {selectedLabel}
              </span>
              {subtitle ? (
                <span className="mt-0.5 line-clamp-2 text-xs text-muted">
                  {subtitle}
                </span>
              ) : null}
            </span>
            <DialogTriggerIcon />
          </button>
        </div>

        {selected || value ? (
          <div className={sideBySideGuide ? "lg:col-span-7" : ""}>
            <SkillGuideRows slug={selected?.behaviorSlug || value} />
          </div>
        ) : null}
      </div>

      {/* Selected Director Description & Suggested Use Case Below */}
      {selected && (selectedDescription || selectedUseCase) ? (
        <div className="grid gap-3 rounded-xl border border-accent-ink/10 bg-paper/50 px-4 py-3 sm:grid-cols-2">
          {selectedDescription ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t("brief.skill.descriptionLabel")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                {selectedDescription}
              </p>
            </div>
          ) : null}
          {selectedUseCase ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t("brief.skill.useCaseLabel")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                {selectedUseCase}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <SkillSelectDialog
          skills={skills}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function DialogTriggerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-muted"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
