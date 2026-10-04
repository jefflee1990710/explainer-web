"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { CreateDirectorButton } from "@/presentation/components/app/directors/create-director-modal";
import type { PublicDirector } from "@/presentation/serialize";
import { localizedVideoType } from "@/util/video-type-i18n";

// Compact top row: back, title, and draft actions. Matches the style desk header.
export function DirectorDeskHeader({
  director,
  name,
  dirty,
  saving,
  canSave,
  status,
  error,
  onBack,
  onSave,
  onDiscard,
  onDelete,
}: {
  director: PublicDirector;
  name: string;
  dirty: boolean;
  saving: boolean;
  canSave: boolean;
  status: string;
  error: string;
  onBack: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onSave: () => void;
  onDiscard: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const templateName = localizedVideoType(director.behaviorSlug, director.baseSlug || director.behaviorSlug);

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
      <div className="min-w-0 flex-1">
        <Link
          href="/app/directors"
          onClick={onBack}
          className="text-xs font-semibold text-muted transition hover:text-foreground"
        >
          {t("directors.backToList")}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <h1 className="font-display truncate text-xl font-bold">{name}</h1>
          {director.isCustom ? (
            <span className="rounded-full border border-accent-ink/15 px-2 py-0.5 text-[11px] font-semibold text-muted">
              {t("directors.templateBadge", { name: templateName })}
            </span>
          ) : (
            <span className="rounded-full border border-accent-ink/15 px-2 py-0.5 text-[11px] font-semibold text-muted">
              {t("directors.readOnly")}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {director.isCustom ? (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Spinner className="h-3.5 w-3.5" /> : null}
              {t("directors.save")}
            </button>
            <button
              type="button"
              onClick={onDiscard}
              disabled={!dirty || saving}
              className="inline-flex h-8 cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-3 text-xs font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("directors.discard")}
            </button>
            {status ? (
              <p role="status" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                {status}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="inline-flex h-8 cursor-pointer items-center rounded-full border border-accent/30 px-3 text-xs font-semibold text-accent transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {t("directors.delete")}
            </button>
          </>
        ) : (
          <CreateDirectorButton
            template={director}
            className="inline-flex h-8 cursor-pointer items-center rounded-full bg-accent px-3 text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5"
          />
        )}
        {error ? (
          <p role="alert" className="text-xs font-medium text-accent">
            {error}
          </p>
        ) : null}
      </div>
    </header>
  );
}
