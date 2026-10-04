"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { StyleDetail } from "@/presentation/components/app/styles/style-detail";
import type { UserStyleFields } from "@/service/style/user-style-fields";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;

// Narrow preview plus name / description so the fields grid can stay one screen.
export function StylePreviewColumn({
  style,
  name,
  draft,
  colorOk,
  previewUrl,
  previewBusy,
  onChange,
}: {
  style: StyleDetail;
  name: string;
  draft: UserStyleFields;
  colorOk: boolean;
  previewUrl?: string;
  previewBusy: boolean;
  onChange: (next: UserStyleFields) => void;
}) {
  const { t } = useI18n();
  const editable = style.isCustom;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div
        className="relative shrink-0 overflow-hidden rounded-xl border border-accent-ink/10"
        style={{ backgroundColor: colorOk ? draft.canvasColor : style.canvasColor }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="aspect-video w-full object-cover" />
        ) : (
          <div className="grid aspect-video place-items-center px-3 text-center font-display text-sm font-bold text-accent-ink/50">
            {name}
          </div>
        )}
        {previewBusy ? (
          <p className="absolute inset-x-0 bottom-0 bg-accent-ink/70 px-3 py-1 text-[11px] font-semibold text-paper">
            {t("styles.previewGenerating")}
          </p>
        ) : null}
      </div>

      {editable ? (
        <div className="flex flex-col gap-2">
          <label className="block shrink-0">
            <span className="mb-1 block text-[11px] font-semibold">{t("styles.nameLabel")}</span>
            <input
              type="text"
              required
              maxLength={NAME_MAX}
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              placeholder={t("styles.namePlaceholder")}
              className="h-8 w-full rounded-full border border-accent-ink/15 bg-paper px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold">{t("styles.descriptionLabel")}</span>
            <textarea
              rows={3}
              maxLength={DESCRIPTION_MAX}
              value={draft.description}
              onChange={(event) => onChange({ ...draft, description: event.target.value })}
              placeholder={t("styles.descriptionPlaceholder")}
              className="w-full resize-none rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>
      ) : style.description ? (
        <p className="min-h-0 overflow-y-auto text-xs leading-5 text-muted">{style.description}</p>
      ) : null}
    </section>
  );
}
