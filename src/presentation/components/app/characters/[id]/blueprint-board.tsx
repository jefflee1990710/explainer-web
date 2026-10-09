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
}: {
  name: string;
  version: PublicCharacterVersion;
}) {
  const { t } = useI18n();
  const busy = version.status === "queued" || version.status === "in_progress";
  const failed = version.status === "failed";
  const portraitBusy = busy && !version.portraitUrl;
  const fullBodyBusy = busy && Boolean(version.portraitUrl) && !version.profileUrl;
  const fullBodyWaiting = busy && !version.portraitUrl;

  return (
    <div className="absolute inset-0 grid grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)] gap-3 p-3">
      <Panel
        label={t("characters.boardPortrait")}
        url={version.portraitUrl}
        alt={t("characters.boardPortraitAlt", { name, n: version.number })}
        busyText={portraitBusy ? t("characters.boardPortraitGenerating") : null}
        failedText={failed && !version.portraitUrl ? errorText(version, t) : null}
      />
      <Panel
        label={t("characters.boardFullBody")}
        url={version.profileUrl}
        alt={t("characters.boardFullBodyAlt", { name, n: version.number })}
        busyText={
          fullBodyBusy
            ? t("characters.boardFullBodyGenerating")
            : fullBodyWaiting
              ? t("characters.boardFullBodyWaiting")
              : null
        }
        failedText={failed && version.portraitUrl && !version.profileUrl ? errorText(version, t) : null}
        tall
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
}: {
  label: string;
  url?: string;
  alt: string;
  busyText: string | null;
  failedText: string | null;
  tall?: boolean;
}) {
  return (
    <figure className="relative flex min-h-0 flex-col overflow-hidden rounded-[1rem] border border-accent-ink/10 bg-accent-ink/[0.03]">
      <div className="relative min-h-0 flex-1">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
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
