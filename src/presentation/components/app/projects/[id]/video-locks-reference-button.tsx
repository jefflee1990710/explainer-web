"use client";

import { useState } from "react";
import { VideoLocksReferenceDialog } from "@/presentation/components/app/projects/[id]/video-locks-reference-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ReferenceStillsIcon } from "@/presentation/studio/studio-action-icons";
import { StudioButton } from "@/presentation/studio/studio-button";
import { StudioHint } from "@/presentation/studio/studio-hint";
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

  const label = t("video.editor.locksButton");
  return (
    <>
      <StudioHint hint={`${label} · ${t("video.editor.locksHint")}`}>
        <StudioButton
          variant="ghost"
          className="w-9 !px-0"
          onClick={() => setOpen(true)}
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <ReferenceStillsIcon />
        </StudioButton>
      </StudioHint>
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
