"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { GenerationDetailTag } from "@/service/clip-stage";

// Icon + clip number. Gray until that output exists; color once it is generated.
export function VideoGenerationTags({ tags }: { tags: GenerationDetailTag[] }) {
  const { t } = useI18n();
  if (tags.length === 0) return null;

  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((tag) => {
        const scene = tag.kind === "scene";
        const label = scene
          ? t("video.card.tagScene", { n: tag.clipNumber })
          : t("video.card.tagVideo", { n: tag.clipNumber });
        return (
          <span
            key={`${tag.kind}-${tag.clipNumber}`}
            title={label}
            aria-label={label}
            className={`inline-flex items-center gap-0.5 rounded-md border px-1 py-0.5 text-[10px] font-semibold tabular-nums ${tone(tag)}`}
          >
            {tag.state === "busy" ? (
              <Spinner className="h-3 w-3" />
            ) : scene ? (
              <SceneIcon />
            ) : (
              <VideoIcon />
            )}
            {tag.clipNumber}
          </span>
        );
      })}
    </span>
  );
}

function tone(tag: GenerationDetailTag) {
  if (tag.state === "ready") {
    return tag.kind === "scene"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (tag.state === "failed") return "border-accent/30 bg-accent/10 text-accent";
  return "border-[var(--studio-line)] bg-[var(--studio-fill)] text-muted";
}

function SceneIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 11.5 5.5 8l2 2L11 6.5 14 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
      <rect x="1.5" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 7.2 14 5.2v5.6l-3.5-2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
