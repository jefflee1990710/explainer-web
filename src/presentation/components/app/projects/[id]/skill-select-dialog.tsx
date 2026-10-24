"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { DirectorPreviewThumb } from "@/presentation/components/director-preview-thumb";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicSkill } from "@/presentation/serialize";
import {
  localizedVideoBlurb,
  localizedVideoType,
  localizedVideoUseCase,
} from "@/util/video-type-i18n";

// Modal dialog for selecting a video type (director) in a searchable grid view with description and suggested use cases below.
export function SkillSelectDialog({
  skills,
  value,
  onChange,
  onClose,
}: {
  skills: PublicSkill[];
  value: string;
  onChange: (slug: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [query, setQuery] = useState("");

  // Close the dialog when Escape is pressed.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Resolve localized display fields for a director skill.
  const resolveSkillMeta = useMemo(() => {
    return (skill: PublicSkill) => {
      const name = skill.isCustom
        ? skill.title
        : localizedVideoType(t, skill.slug, skill.title);
      const description = skill.isCustom
        ? skill.description
        : localizedVideoBlurb(t, skill.slug, skill.description);
      const useCase = skill.isCustom
        ? skill.suggestedUseCase ||
          localizedVideoUseCase(t, skill.behaviorSlug, "")
        : localizedVideoUseCase(
            t,
            skill.slug,
            skill.suggestedUseCase || "",
          );
      return { name, description, useCase };
    };
  }, [t]);

  const normalizedQuery = query.trim().toLowerCase();

  // Filter directors by name, description, or suggested use case (both localized and English).
  const filteredSkills = useMemo(() => {
    if (!normalizedQuery) return skills;
    return skills.filter((skill) => {
      const meta = resolveSkillMeta(skill);
      const haystack = [
        meta.name,
        meta.description,
        meta.useCase,
        skill.title,
        skill.description,
        skill.suggestedUseCase,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [skills, normalizedQuery, resolveSkillMeta]);

  const systemSkills = useMemo(
    () => filteredSkills.filter((skill) => !skill.isCustom),
    [filteredSkills],
  );
  const customSkills = useMemo(
    () => filteredSkills.filter((skill) => skill.isCustom),
    [filteredSkills],
  );
  const hasCustom = useMemo(
    () => skills.some((skill) => skill.isCustom),
    [skills],
  );

  const selected = useMemo(
    () => skills.find((skill) => skill.slug === value) ?? skills[0],
    [skills, value],
  );
  const selectedMeta = selected ? resolveSkillMeta(selected) : null;

  // Render a responsive grid section of director cards.
  function renderGridSection(sectionLabel: string | null, rows: PublicSkill[]) {
    if (rows.length === 0) return null;
    return (
      <section aria-label={sectionLabel ?? t("brief.skill.aria")}>
        {sectionLabel ? (
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">
            {sectionLabel}
          </h3>
        ) : null}
        <div
          role="listbox"
          aria-label={sectionLabel ?? t("brief.skill.aria")}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {rows.map((skill) => {
            const active = skill.slug === value;
            const meta = resolveSkillMeta(skill);
            return (
              <button
                key={skill.slug}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onChange(skill.slug)}
                className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition ${
                  active
                    ? "border-accent-ink bg-accent-ink text-paper shadow-[4px_4px_0_0_rgba(18,20,28,0.2)]"
                    : "border-accent-ink/15 bg-white hover:border-accent-ink/40"
                }`}
              >
                <div className="relative w-full overflow-hidden border-b border-accent-ink/10">
                  <DirectorPreviewThumb
                    previewUrl={skill.previewUrl}
                    label={meta.name}
                    size="card"
                  />
                  {active ? (
                    <span className="absolute top-2 right-2 rounded-full bg-accent-ink/90 px-2.5 py-0.5 text-[10px] font-bold text-paper shadow-sm">
                      ✓ {t("brief.skill.selectedBadge")}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <span className="block truncate font-display text-sm font-bold">
                      {meta.name}
                    </span>
                    {meta.description ? (
                      <span
                        className={`mt-1 line-clamp-2 text-xs leading-relaxed ${
                          active ? "text-paper/80" : "text-muted"
                        }`}
                      >
                        {meta.description}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper shadow-[8px_8px_0_0_#12141c]"
      >
        {/* Dialog Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {t("brief.skill.dialogTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {t("brief.skill.dialogSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Search Input at Top of Dialog */}
        <div className="shrink-0 border-b border-accent-ink/10 bg-paper/80 px-6 py-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("brief.skill.searchPlaceholder")}
            aria-label={t("brief.skill.searchPlaceholder")}
            autoFocus
            className="h-10 w-full rounded-full border border-accent-ink/20 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        {/* Scrollable Grid View of Directors */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {filteredSkills.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              {t("brief.skill.noSearchMatch", { query: query.trim() })}
            </p>
          ) : hasCustom ? (
            <>
              {renderGridSection(t("directors.systemSection"), systemSkills)}
              {renderGridSection(t("directors.mineSection"), customSkills)}
            </>
          ) : (
            renderGridSection(null, systemSkills)
          )}
        </div>

        {/* Selected Director Detail Panel: Description & Suggested Use Case Below Grid */}
        {selected && selectedMeta ? (
          <div className="shrink-0 border-t border-accent-ink/15 bg-white px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex items-center gap-3">
                  <DirectorPreviewThumb
                    previewUrl={selected.previewUrl}
                    label={selectedMeta.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="inline-block rounded-full bg-accent-ink/8 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                      {t("brief.skill.selectedBadge")}
                    </span>
                    <h3 className="truncate font-display text-base font-bold text-foreground">
                      {selectedMeta.name}
                    </h3>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-accent-ink/10 bg-paper/60 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {t("brief.skill.descriptionLabel")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                      {selectedMeta.description}
                    </p>
                  </div>

                  {selectedMeta.useCase ? (
                    <div className="rounded-xl border border-accent-ink/10 bg-paper/60 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        {t("brief.skill.useCaseLabel")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                        {selectedMeta.useCase}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-full bg-accent-ink px-5 py-2.5 text-xs font-bold text-paper transition hover:opacity-90"
                >
                  {t("brief.skill.doneButton")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DialogBackdrop>
  );
}
