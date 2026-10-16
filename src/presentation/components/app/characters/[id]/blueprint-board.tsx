"use client";

import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacterVersion } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Board blueprint: identity portrait on the left, full-body figure on the right.
// Each panel shows its own progress so the user sees the two images arrive in turn.
export function BlueprintBoard({
  name,
  version,
  onPreviewImage,
}: {
  name: string;
  version: PublicCharacterVersion;
  onPreviewImage?: (preview: { src: string; title: string; alt: string }) => void;
}) {
  const { t } = useI18n();
  const busy = version.status === "queued" || version.status === "in_progress";
  const failed = version.status === "failed";
  const portraitBusy = busy && !version.portraitUrl;
  const fullBodyBusy = busy && Boolean(version.portraitUrl) && !version.profileUrl;
  const fullBodyWaiting = busy && !version.portraitUrl;
  const portraitAlt = t("characters.boardPortraitAlt", { name, n: version.number });
  const fullBodyAlt = t("characters.boardFullBodyAlt", { name, n: version.number });

  return (
    <div className="absolute inset-0 grid grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)] gap-3 p-3">
      <Panel
        label={t("characters.boardPortrait")}
        url={version.portraitUrl}
        alt={portraitAlt}
        busyText={portraitBusy ? t("characters.boardPortraitGenerating") : null}
        failedText={failed && !version.portraitUrl ? errorText(version, t) : null}
        onPreview={
          version.portraitUrl && onPreviewImage
            ? () =>
                onPreviewImage({
                  src: version.portraitUrl!,
                  title: `${name} · v${version.number} · ${t("characters.boardPortrait")}`,
                  alt: portraitAlt,
                })
            : undefined
        }
      />
      <Panel
        label={t("characters.boardFullBody")}
        url={version.profileUrl}
        alt={fullBodyAlt}
        busyText={
          fullBodyBusy
            ? t("characters.boardFullBodyGenerating")
            : fullBodyWaiting
              ? t("characters.boardFullBodyWaiting")
              : null
        }
        failedText={failed && version.portraitUrl && !version.profileUrl ? errorText(version, t) : null}
        tall
        onPreview={
          version.profileUrl && onPreviewImage
            ? () =>
                onPreviewImage({
                  src: version.profileUrl!,
                  title: `${name} · v${version.number} · ${t("characters.boardFullBody")}`,
                  alt: fullBodyAlt,
                })
            : undefined
        }
      />
    </div>
  );
}

function errorText(version: PublicCharacterVersion, t: ReturnType<typeof useI18n>["t"]) {
  return version.error ? translateAppError(version.error, t) : t("characters.versionFailedFallback");
}

// One image slot with a small caption; falls back to a spinner or an error line.
function Panel({
  label,
  url,
  alt,
  busyText,
  failedText,
  tall,
  onPreview,
}: {
  label: string;
  url?: string;
  alt: string;
  busyText: string | null;
  failedText: string | null;
  tall?: boolean;
  onPreview?: () => void;
}) {
  return (
    <figure className="relative flex min-h-0 flex-col overflow-hidden rounded-[1rem] border border-accent-ink/10 bg-accent-ink/[0.03]">
      <div className="relative min-h-0 flex-1">
        {url ? (
          <button
            type="button"
            onClick={onPreview}
            aria-label={alt}
            className="group absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              className="h-full w-full object-contain transition duration-150 group-hover:scale-[1.015]"
            />
          </button>
        ) : (
          <div className="absolute inset-0 grid place-items-center px-4 text-center text-xs text-muted">
            {busyText ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="h-3.5 w-3.5" /> {busyText}
              </span>
            ) : failedText ? (
              <span className="text-accent">{failedText}</span>
            ) : (
              <span
                className={`rounded-md border-2 border-dashed border-accent-ink/20 ${tall ? "h-20 w-9" : "h-14 w-14"}`}
                aria-hidden
              />
            )}
          </div>
        )}
      </div>
      <figcaption className="shrink-0 border-t border-accent-ink/10 bg-paper/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </figcaption>
    </figure>
  );
}
