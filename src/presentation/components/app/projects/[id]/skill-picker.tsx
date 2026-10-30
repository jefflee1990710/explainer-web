"use client";

import { useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { SkillGuideRows } from "@/presentation/components/app/projects/[id]/skill-guide-rows";
import { SkillSelectDialog } from "@/presentation/components/app/projects/[id]/skill-select-dialog";
import type { PublicSkill } from "@/presentation/serialize";
import { localizedVideoType } from "@/util/video-type-i18n";

// Selected video type sits between previous/next. The center opens the picker dialog.
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
  const foundIndex = skills.findIndex((skill) => skill.slug === value);
  const selected = foundIndex >= 0 ? skills[foundIndex] : undefined;
  const optionName = (skill: PublicSkill) =>
    skill.isCustom
      ? skill.title
      : localizedVideoType(t, skill.slug, skill.title);
  const selectedLabel = selected
    ? optionName(selected)
    : value
      ? localizedVideoType(t, value, value)
      : t("brief.skill.aria");

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
  }

  function step(delta: number) {
    if (skills.length === 0) return;
    const base = foundIndex >= 0 ? foundIndex : delta > 0 ? -1 : 0;
    const next = (base + delta + skills.length) % skills.length;
    const skill = skills[next];
    if (skill) onChange(skill.slug);
  }

  if (skills.length === 0) {
    return <p className="text-sm text-muted">{t("brief.skill.empty")}</p>;
  }

  const arrowClass =
    "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 bg-white text-foreground transition hover:border-accent-ink hover:bg-lime/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

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
          <div className="flex min-h-[4.5rem] items-center gap-2 rounded-xl border border-accent-ink/15 bg-paper/70 px-2 py-2">
            <button
              type="button"
              className={arrowClass}
              aria-label={t("brief.skill.previous")}
              disabled={disabled || skills.length < 2}
              onClick={() => step(-1)}
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              aria-label={t("brief.skill.aria")}
              aria-haspopup="dialog"
              aria-expanded={open}
              disabled={disabled}
              onClick={() => setOpen(true)}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-1 py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <TypeIcon previewUrl={selected?.previewUrl} label={selectedLabel} />
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
            </button>
            <button
              type="button"
              className={arrowClass}
              aria-label={t("brief.skill.next")}
              disabled={disabled || skills.length < 2}
              onClick={() => step(1)}
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>

        {sideBySideGuide && (selected || value) ? (
          <div className="lg:col-span-7">
            <SkillGuideRows slug={selected?.behaviorSlug || value} />
          </div>
        ) : null}
      </div>

      {open ? (
        <SkillSelectDialog
          skills={skills}
          value={value}
          onChange={(slug) => {
            onChange(slug);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function TypeIcon({ previewUrl, label }: { previewUrl?: string; label: string }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-accent-ink/10 bg-white">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="px-1 text-center font-display text-[9px] font-bold leading-tight text-accent-ink/60">
          {label.slice(0, 2)}
        </span>
      )}
    </span>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d={direction === "left" ? "M12.5 5L7.5 10L12.5 15" : "M7.5 5L12.5 10L7.5 15"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
