"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { DirectorPreviewThumb } from "@/presentation/components/director-preview-thumb";
import type { DirectorForm } from "@/presentation/components/app/directors/[id]/director-info-panel";
import type { PublicDirector } from "@/presentation/serialize";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;

// Narrow preview plus name / description, matching the style desk preview column.
export function DirectorPreviewColumn({
  director,
  name,
  draft,
  previewUrl,
  previewBusy,
  onChange,
}: {
  director: PublicDirector;
  name: string;
  draft: DirectorForm;
  previewUrl?: string;
  previewBusy: boolean;
  onChange: (next: DirectorForm) => void;
}) {
  const { t } = useI18n();
  const editable = director.isCustom;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="relative shrink-0 overflow-hidden rounded-xl border border-accent-ink/10 bg-accent-ink/[0.04]">
        {previewUrl ? (
          <DirectorPreviewThumb previewUrl={previewUrl} label={name} size="cover" />
        ) : (
          <div className="grid aspect-video place-items-center px-3 text-center font-display text-sm font-bold text-accent-ink/50">
            {name}
          </div>
        )}
        {previewBusy ? (
          <p className="absolute inset-x-0 bottom-0 bg-accent-ink/70 px-3 py-1 text-[11px] font-semibold text-paper">
            {t("directors.previewGenerating")}
          </p>
        ) : null}
      </div>

      {editable ? (
        <div className="flex flex-col gap-2">
          <label className="block shrink-0">
            <span className="mb-1 block text-[11px] font-semibold">{t("directors.nameLabel")}</span>
            <input
              type="text"
              required
              maxLength={NAME_MAX}
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              placeholder={t("directors.namePlaceholder")}
              className="h-8 w-full rounded-full border border-accent-ink/15 bg-paper px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold">{t("directors.descriptionLabel")}</span>
            <textarea
              rows={3}
              maxLength={DESCRIPTION_MAX}
              value={draft.description}
              onChange={(event) => onChange({ ...draft, description: event.target.value })}
              placeholder={t("directors.descriptionPlaceholder")}
              className="w-full resize-none rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>
      ) : director.description ? (
        <p className="min-h-0 overflow-y-auto text-xs leading-5 text-muted">{director.description}</p>
      ) : null}
    </section>
  );
}
