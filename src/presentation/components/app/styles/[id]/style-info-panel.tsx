"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { CreateStyleButton } from "@/presentation/components/app/styles/create-style-modal";
import { StyleField } from "@/presentation/components/app/styles/[id]/style-field";
import {
  catalogStyleLabel,
  changedVisualKeys,
  type StyleDetail,
} from "@/presentation/components/app/styles/style-detail";
import { USER_STYLE_VISUAL_KEYS, type UserStyleFields } from "@/service/style/user-style-fields";
import type { PublicStyle } from "@/presentation/serialize";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;
const FIELD_MAX = 2000;

// Left pane: name, description, every visual field, and Save / Discard / Delete.
export function StyleInfoPanel({
  style,
  saved,
  draft,
  dirty,
  saving,
  canSave,
  status,
  error,
  onChange,
  onSave,
  onDiscard,
  onDelete,
}: {
  style: StyleDetail;
  saved: UserStyleFields;
  draft: UserStyleFields;
  dirty: boolean;
  saving: boolean;
  canSave: boolean;
  status: string;
  error: string;
  onChange: (next: UserStyleFields) => void;
  onSave: () => void;
  onDiscard: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const editable = style.isCustom;
  const changed = changedVisualKeys(saved, draft);
  const templateName = style.baseStyleId
    ? catalogStyleLabel(t, style.baseStyleId, style.templateName ?? style.baseStyleId)
    : style.templateName;
  const template: PublicStyle = {
    id: style.id,
    name: catalogStyleLabel(t, style.id, style.name),
    description: style.description,
    canvasColor: style.canvasColor,
    previewUrl: style.previewUrl,
    isCustom: false,
  };

  function setField(key: keyof UserStyleFields, value: string) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <section className="min-w-0 rounded-[1.75rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        {editable ? (
          <span className="rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-xs font-semibold text-muted">
            {t("styles.templateBadge", { name: templateName ?? "" })}
          </span>
        ) : (
          <>
            <span className="rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {t("styles.readOnly")}
            </span>
            <CreateStyleButton
              template={template}
              className="ml-auto inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5"
            />
          </>
        )}
      </div>

      {editable ? (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("styles.nameLabel")}</span>
            <input
              type="text"
              required
              maxLength={NAME_MAX}
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder={t("styles.namePlaceholder")}
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("styles.descriptionLabel")}</span>
            <textarea
              rows={3}
              maxLength={DESCRIPTION_MAX}
              value={draft.description}
              onChange={(event) => setField("description", event.target.value)}
              placeholder={t("styles.descriptionPlaceholder")}
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>
      ) : style.description ? (
        <p className="mt-4 text-sm leading-6 text-muted">{style.description}</p>
      ) : null}

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("styles.fieldsTitle")}</h2>
      <div className="mt-3 space-y-3">
        {USER_STYLE_VISUAL_KEYS.map((key) => (
          <StyleField
            key={key}
            label={t(`styles.fields.${key}`)}
            value={editable ? draft[key] : styleValue(style, key)}
            editable={editable}
            modified={changed.includes(key)}
            maxLength={FIELD_MAX}
            rows={key === "look" || key === "negatives" ? 5 : 3}
            kind={key === "canvasColor" ? "color" : "text"}
            onChange={(value) => setField(key, value)}
          />
        ))}
      </div>

      {editable ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-accent-ink/10 pt-5">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Spinner className="h-4 w-4" /> : null}
            {t("styles.save")}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={!dirty || saving}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("styles.discard")}
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
            {t("styles.delete")}
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

function styleValue(style: StyleDetail, key: (typeof USER_STYLE_VISUAL_KEYS)[number]): string {
  return style[key] ?? "";
}
