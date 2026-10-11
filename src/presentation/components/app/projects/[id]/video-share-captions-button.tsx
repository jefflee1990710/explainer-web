"use client";

import { useState } from "react";
import { VideoShareCaptionsDialog } from "@/presentation/components/app/projects/[id]/video-share-captions-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioButton } from "@/presentation/studio/studio-button";

// Header control that opens the Reel, Shorts, and YouTube caption dialog.
export function VideoShareCaptionsButton({ videoId }: { videoId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <StudioButton
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {t("video.editor.captionsButton")}
      </StudioButton>
      {open ? <VideoShareCaptionsDialog videoId={videoId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
