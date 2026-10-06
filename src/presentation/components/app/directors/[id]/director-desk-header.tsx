"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { CreateDirectorButton } from "@/presentation/components/app/directors/create-director-modal";
import { DirectorPreviewButton } from "@/presentation/components/app/directors/[id]/director-preview-button";
import type { DirectorPreviewStatus } from "@/model/skill";
import type { PublicDirector } from "@/presentation/serialize";
import { localizedVideoType } from "@/util/video-type-i18n";

// Compact top row: back, title, preview generate, and draft actions.
export function DirectorDeskHeader({
  director,
  name,
  dirty,
  saving,
  status,
  error,
  previewStatus,
  previewCurrent,
  onBack,
  onEnsureSaved,
  onDelete,
  onGenerating,
}: {
  director: PublicDirector;
  name: string;
  dirty: boolean;
  saving: boolean;
  status: string;
  error: string;
  previewStatus: DirectorPreviewStatus;
  previewCurrent: boolean;
  onBack: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onEnsureSaved: () => Promise<boolean>;
  onDelete: () => void;
  onGenerating: () => void;
}) {
  const { t } = useI18n();
  const templateName = localizedVideoType(t, director.behaviorSlug, director.baseSlug || director.behaviorSlug);

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
            <DirectorPreviewButton
              directorId={director.id}
              dirty={dirty}
              previewStatus={previewStatus}
              previewCurrent={previewCurrent}
              compact
              onEnsureSaved={onEnsureSaved}
              onGenerating={onGenerating}
            />
            {status ? (
              <p role="status" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                {saving ? <Spinner className="h-3.5 w-3.5" /> : null}
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
