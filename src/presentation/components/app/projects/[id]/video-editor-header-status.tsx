"use client";

import { VideoEditorTaskQueue } from "@/presentation/components/app/projects/[id]/video-editor-task-queue";
import { useI18n } from "@/presentation/components/i18n-provider";
import { CreditMeter } from "@/presentation/studio/credit-meter";

// Pending tasks and remaining credits, pinned to the video editor dialog header.
export function VideoEditorHeaderStatus({
  videoId,
  credits,
  creditLimit,
}: {
  // Omitted while drafting a brand-new video before the first save.
  videoId?: string;
  credits: number;
  creditLimit: number;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {videoId ? <VideoEditorTaskQueue videoId={videoId} /> : null}
      <CreditMeter
        credits={credits}
        creditLimit={creditLimit}
        creditsLabel={t("common.credits")}
        className="min-w-28"
      />
    </div>
  );
}
