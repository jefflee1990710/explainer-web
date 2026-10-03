"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { SkillGuideRows } from "@/presentation/components/app/projects/[id]/skill-guide-rows";
import { DirectorPreviewThumb } from "@/presentation/components/director-preview-thumb";
import type { PublicSkill } from "@/presentation/serialize";
import { localizedVideoType } from "@/util/video-type-i18n";

// Director (video type) dropdown: system directors, then the user's own, with stills.
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
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const system = skills.filter((skill) => !skill.isCustom);
  const mine = skills.filter((skill) => skill.isCustom);
  const selected = skills.find((skill) => skill.slug === value);
  const optionName = (skill: PublicSkill) => skill.title;

  let subtitle = "";
  if (selected?.isCustom) {
    const template = system.find((skill) => skill.slug === selected.behaviorSlug);
    const templateName = localizedVideoType(selected.behaviorSlug, template?.title || selected.behaviorSlug);
    subtitle = t("directors.templateBadge", { name: templateName });
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (skills.length === 0) {
    return <p className="text-sm text-muted">{t("brief.skill.empty")}</p>;
  }

  function pick(slug: string) {
    onChange(slug);
    setOpen(false);
  }

  function renderGroup(label: string, rows: PublicSkill[]) {
    if (rows.length === 0) return null;
    return (
      <li role="presentation">
        <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <ul role="group" aria-label={label}>
          {rows.map((skill) => {
            const active = skill.slug === value;
            const name = optionName(skill);
            return (
              <li key={skill.slug} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(skill.slug)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
                  }`}
                >
                  <DirectorPreviewThumb previewUrl={skill.previewUrl} label={name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{name}</span>
                    {skill.description ? (
                      <span className={`mt-0.5 block truncate text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                        {skill.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </li>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          id={`${listboxId}-trigger`}
          aria-label={t("brief.skill.aria")}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-accent-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {selected ? <DirectorPreviewThumb previewUrl={selected.previewUrl} label={optionName(selected)} /> : null}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {selected ? optionName(selected) : t("brief.skill.aria")}
            </span>
            {subtitle ? <span className="mt-0.5 block truncate text-xs text-muted">{subtitle}</span> : null}
          </span>
          <ChevronIcon open={open} />
        </button>

        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={t("brief.skill.aria")}
            aria-labelledby={`${listboxId}-trigger`}
            className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-accent-ink/15 bg-paper p-1 shadow-[4px_4px_0_0_rgba(18,20,28,0.08)]"
          >
            {renderGroup(t("directors.systemSection"), system)}
            {renderGroup(t("directors.mineSection"), mine)}
          </ul>
        ) : null}
      </div>
      {selected ? <SkillGuideRows slug={selected.behaviorSlug} /> : null}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
