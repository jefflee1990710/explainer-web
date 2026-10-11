"use client";

import { VideoShareIcon } from "@/presentation/components/app/projects/new/video-share-icons";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import type { VideoShareId } from "@/service/video-share/platforms";

// One platform's generated title, description, or caption.
export function VideoShareCaptionCard({
  id,
  titled,
  title,
  body,
  busy,
  error,
  copiedKey,
  onGenerate,
  onTitle,
  onBody,
  onCopy,
}: {
  id: VideoShareId;
  titled: boolean;
  title: string;
  body: string;
  busy: boolean;
  error: string;
  copiedKey: string;
  onGenerate: () => void;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  onCopy: (key: string, value: string) => void;
}) {
  const { t } = useI18n();
  const ready = titled ? Boolean(title || body) : Boolean(body);

  return (
    <section className="rounded-2xl border border-[var(--studio-line)] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <VideoShareIcon id={id} />
          <span className="truncate">{t(`video.share.target.${id}`)}</span>
        </h3>
        <StudioButton variant="ghost" disabled={busy} onClick={onGenerate}>
          {busy ? <Spinner className="h-4 w-4" /> : null}
          {t("video.share.captionsGenerate")}
        </StudioButton>
      </div>
      {ready ? (
        <div className="mt-3 space-y-3">
          {titled ? (
            <CaptionField
              label={t("video.share.captionsTitleLabel")}
              value={title}
              rows={2}
              copied={copiedKey === `${id}:title`}
              onChange={onTitle}
              onCopy={() => onCopy(`${id}:title`, title)}
            />
          ) : null}
          <CaptionField
            label={titled ? t("video.share.captionsDescriptionLabel") : t("video.share.captionsBodyLabel")}
            value={body}
            rows={titled ? 5 : 4}
            copied={copiedKey === `${id}:body`}
            onChange={onBody}
            onCopy={() => onCopy(`${id}:body`, body)}
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-[#e11d48]">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function CaptionField({
  label,
  value,
  rows,
  copied,
  onChange,
  onCopy,
}: {
  label: string;
  value: string;
  rows: number;
  copied: boolean;
  onChange: (value: string) => void;
  onCopy: () => void;
}) {
  const { t } = useI18n();
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-[var(--studio-muted)]">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-y rounded-lg border border-[var(--studio-line)] bg-white px-2 py-1.5 text-xs leading-5 text-[var(--studio-ink)]"
      />
      <button
        type="button"
        onClick={onCopy}
        className="mt-1 text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:underline"
      >
        {copied ? t("video.share.captionsCopied") : t("video.share.captionsCopy")}
      </button>
    </label>
  );
}
