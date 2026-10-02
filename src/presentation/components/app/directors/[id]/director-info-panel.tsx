"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicDirector } from "@/presentation/serialize";
import { CreateDirectorButton } from "@/presentation/components/app/directors/create-director-modal";
import { DirectorFileSection } from "@/presentation/components/app/directors/[id]/director-file-section";
import { SKILL_PATH, type DirectorDraft } from "@/service/director/director-edits";
import { localizedVideoType } from "@/util/video-type-i18n";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;

// Editable director fields held by the workspace.
export type DirectorForm = DirectorDraft & { title: string; description: string };

// Left pane: name, description, template badge, files, and Save / Discard / Delete.
export function DirectorInfoPanel({
  director,
  draft,
  changedPaths,
  dirty,
  saving,
  status,
  error,
  onChange,
  onSave,
  onDiscard,
  onDelete,
}: {
  director: PublicDirector;
  draft: DirectorForm;
  changedPaths: string[];
  dirty: boolean;
  saving: boolean;
  status: string;
  error: string;
  onChange: (next: DirectorForm) => void;
  onSave: () => void;
  onDiscard: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const editable = director.isCustom;
  const templateName = localizedVideoType(t, director.behaviorSlug, "") || director.baseSlug || director.behaviorSlug;

  function setReference(path: string, content: string) {
    onChange({
      ...draft,
      references: draft.references.map((ref) => (ref.path === path ? { ...ref, content } : ref)),
    });
  }

  return (
    <section className="min-w-0 rounded-[1.75rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        {editable ? (
          <span className="rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-xs font-semibold text-muted">
            {t("directors.templateBadge", { name: templateName })}
          </span>
        ) : (
          <>
            <span className="rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {t("directors.readOnly")}
            </span>
            <CreateDirectorButton
              template={director}
              className="ml-auto inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5"
            />
          </>
        )}
      </div>

      {editable ? (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("directors.nameLabel")}</span>
            <input
              type="text"
              required
              maxLength={NAME_MAX}
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              placeholder={t("directors.namePlaceholder")}
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("directors.descriptionLabel")}</span>
            <textarea
              rows={3}
              maxLength={DESCRIPTION_MAX}
              value={draft.description}
              onChange={(event) => onChange({ ...draft, description: event.target.value })}
              placeholder={t("directors.descriptionPlaceholder")}
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>
      ) : director.description ? (
        <p className="mt-4 text-sm leading-6 text-muted">{director.description}</p>
      ) : null}

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {t("directors.filesTitle")}
      </h2>
      <div className="mt-3 space-y-3">
        <DirectorFileSection
          path={SKILL_PATH}
          content={draft.systemPrompt}
          editable={editable}
          modified={changedPaths.includes(SKILL_PATH)}
          defaultOpen
          onChange={(systemPrompt) => onChange({ ...draft, systemPrompt })}
        />
        {draft.references.map((ref) => (
          <DirectorFileSection
            key={ref.path}
            path={ref.path}
            content={ref.content}
            editable={editable}
            modified={changedPaths.includes(ref.path)}
            onChange={(content) => setReference(ref.path, content)}
          />
        ))}
      </div>

      {editable ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-accent-ink/10 pt-5">
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving || !draft.title.trim()}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Spinner className="h-4 w-4" /> : null}
            {t("directors.save")}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={!dirty || saving}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("directors.discard")}
          </button>
          {status ? (
            <p role="status" className="text-sm font-semibold text-muted">
              {status}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="ml-auto inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent/30 px-4 text-sm font-semibold text-accent transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {t("directors.delete")}
          </button>
          {error ? (
            <p role="alert" className="w-full text-sm font-medium text-accent">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
