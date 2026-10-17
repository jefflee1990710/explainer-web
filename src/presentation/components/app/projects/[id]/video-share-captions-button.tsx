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

  const label = t("video.editor.captionsButton");
  return (
    <>
      <StudioHint hint={`${label} · ${t("video.editor.captionsHint")}`}>
        <StudioButton
          variant="ghost"
          className="w-9 !px-0"
          onClick={() => setOpen(true)}
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CaptionsIcon />
        </StudioButton>
      </StudioHint>
      {open ? <VideoShareCaptionsDialog videoId={videoId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
