"use client";

import { useState } from "react";
import { VideoLocksReferenceDialog } from "@/presentation/components/app/projects/[id]/video-locks-reference-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioButton } from "@/presentation/studio/studio-button";
import type { PublicVideo } from "@/presentation/serialize";

export function videoHasLockReferences(
  video: Pick<PublicVideo, "objectSheetUrl" | "backgroundPlates"> | null | undefined,
) {
  if (!video) return false;
  if (video.objectSheetUrl) return true;
  return (video.backgroundPlates || []).some((plate) => Boolean(plate.url));
}

// Header control that opens the prop sheet / empty-set plate gallery.
export function VideoLocksReferenceButton({
  objectSheetUrl,
  objectSheetItems,
  backgroundPlates,
}: {
  objectSheetUrl?: string;
  objectSheetItems?: PublicVideo["objectSheetItems"];
  backgroundPlates?: PublicVideo["backgroundPlates"];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!videoHasLockReferences({ objectSheetUrl, backgroundPlates })) return null;

  return (
    <>
      <StudioButton
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {t("video.editor.locksButton")}
      </StudioButton>
      {open ? (
        <VideoLocksReferenceDialog
          objectSheetUrl={objectSheetUrl}
          objectSheetItems={objectSheetItems}
          backgroundPlates={backgroundPlates}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
