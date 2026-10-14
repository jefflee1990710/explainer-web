"use client";

import { useState } from "react";
import { VideoShareCaptionsDialog } from "@/presentation/components/app/projects/[id]/video-share-captions-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { CaptionsIcon } from "@/presentation/studio/studio-action-icons";
import { StudioButton } from "@/presentation/studio/studio-button";
import { StudioHint } from "@/presentation/studio/studio-hint";

// Header control that opens the Reel, Shorts, and YouTube caption dialog.
export function VideoShareCaptionsButton({ videoId }: { videoId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <StudioHint hint={t("video.editor.captionsHint")}>
        <StudioButton
          variant="ghost"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CaptionsIcon />
          {t("video.editor.captionsButton")}
        </StudioButton>
      </StudioHint>
      {open ? <VideoShareCaptionsDialog videoId={videoId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
