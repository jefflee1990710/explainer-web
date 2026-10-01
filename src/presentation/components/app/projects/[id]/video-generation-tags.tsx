"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { GenerationDetailTag } from "@/service/clip-stage";

// Per-clip scene and video chips on an in-production card.
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
        const tone =
          tag.state === "failed"
            ? "text-accent"
            : scene
              ? "text-orange-800"
              : "text-blue-800";
        return (
          <span
            key={`${tag.kind}-${tag.clipNumber}`}
            className={`inline-flex items-center gap-1 rounded-md border border-[var(--studio-line)] bg-[var(--studio-fill)] px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}
          >
            {tag.state === "busy" ? (
              <Spinner className="h-2.5 w-2.5" />
            ) : (
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  tag.state === "failed" ? "bg-accent" : scene ? "bg-orange-500" : "bg-blue-500"
                }`}
              />
            )}
            {label}
          </span>
        );
      })}
    </span>
  );
}
