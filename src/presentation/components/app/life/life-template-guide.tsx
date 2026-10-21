"use client";

import { lifePostTemplateById } from "@/model/life-post-template";
import { LifeTemplateArt } from "@/presentation/components/app/life/life-template-art";
import { useI18n } from "@/presentation/components/i18n-provider";

// Selected post type, its shooting tips, and the optional composition reference upload.
export function LifeTemplateGuide({
  templateId,
  compositionRefUrl,
  uploading,
  disabled,
  onOpenPicker,
  onClear,
  onUploadRef,
  onRemoveRef,
}: {
  templateId: string;
  compositionRefUrl: string;
  uploading: boolean;
  disabled: boolean;
  onOpenPicker: () => void;
  onClear: () => void;
  onUploadRef: (file: File | undefined) => void;
  onRemoveRef: () => void;
}) {
  const { t } = useI18n();
  const template = lifePostTemplateById(templateId);

  if (!template) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-accent-ink/10 bg-paper p-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-foreground">{t("life.templates.title")}</p>
          <p className="truncate text-[11px] text-muted">{t("life.templates.hint")}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onOpenPicker}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full bg-accent-ink px-3.5 text-xs font-bold text-lime disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("life.templates.title")}
        </button>
      </div>
    );
  }

  const name = t(`life.templates.names.${template.id}`);
  return (
    <div className="flex gap-3 rounded-xl border border-accent bg-paper p-2.5">
      <button
        type="button"
        disabled={disabled}
        onClick={onOpenPicker}
        aria-label={t("life.templates.title")}
        className="relative block aspect-[3/4] w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-zinc-200 disabled:cursor-not-allowed"
      >
        <LifeTemplateArt id={template.id} label={name} />
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="text-xs font-bold text-foreground">
            <span className="text-muted">{t(`life.templates.categories.${template.categoryId}`)} · </span>
            {name}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={onOpenPicker}
              className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-foreground disabled:opacity-60"
            >
              {t("life.templates.title")}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-foreground disabled:opacity-60"
            >
              {t("life.templates.clear")}
            </button>
          </div>
        </div>
        <p className="text-[11px] leading-snug text-foreground">
          <span className="font-bold">{t("life.templates.tipsTitle")}：</span>
          {t(`life.templates.tips.${template.id}`)}
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-accent-ink/5 p-2">
          {compositionRefUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={compositionRefUrl}
              alt={t("life.templates.compositionRef")}
              className="h-14 w-11 shrink-0 rounded-md object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-foreground">{t("life.templates.compositionRef")}</p>
            <p className="text-[10px] leading-snug text-muted">{t("life.templates.compositionRefHint")}</p>
          </div>
          {compositionRefUrl ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemoveRef}
              className="shrink-0 cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-red-600 disabled:opacity-60"
            >
              {t("life.templates.compositionRefRemove")}
            </button>
          ) : (
            <label className="inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full border border-accent-ink/20 bg-paper px-2.5 text-[11px] font-bold text-foreground hover:border-accent-ink">
              {uploading ? t("common.loading") : t("life.templates.compositionRefUpload")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={disabled}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  onUploadRef(file);
                }}
              />
            </label>
          )}
        </div>
        <p className="text-[10px] text-muted">{t("life.templates.sceneOptional")}</p>
      </div>
    </div>
  );
}
