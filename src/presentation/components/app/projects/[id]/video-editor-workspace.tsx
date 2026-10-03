"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NewProjectForm } from "@/presentation/components/app/projects/new/new-project-form";
import { DeleteVideoDialog } from "@/presentation/components/app/projects/[id]/delete-video-dialog";
import {
  EditorStepSwitch,
  type EditorStepNav,
} from "@/presentation/components/app/projects/[id]/editor-step-switch";
import { VideoEditorDialog } from "@/presentation/components/app/projects/[id]/video-editor-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import type {
  PublicCharacter,
  PublicSkill,
  PublicStyle,
  PublicVideo,
} from "@/presentation/serialize";
import { folderPath, folderVideoPath } from "@/service/folder-video-path";

// Dedicated editor page. Same-tab from the folder list.
export function VideoEditorWorkspace({
  folderId,
  skills,
  styles,
  characters,
  credits,
  creditLimit,
  subscribed,
  initialVideo,
}: {
  folderId: string;
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  credits: number;
  creditLimit: number;
  subscribed: boolean;
  initialVideo: PublicVideo | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [video, setVideo] = useState(initialVideo);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stepNav, setStepNav] = useState<EditorStepNav | null>(null);

  useEffect(() => {
    setVideo(initialVideo);
  }, [initialVideo]);

  const onStepNav = useCallback((nav: EditorStepNav | null) => {
    setStepNav((current) => {
      if (current === nav) return current;
      if (!current || !nav) return nav;
      if (
        current.status === nav.status &&
        current.viewing === nav.viewing &&
        current.clipsReady === nav.clipsReady &&
        current.failedAtStep === nav.failedAtStep
      ) {
        if (current.onSelectStep === nav.onSelectStep) return current;
        return { ...current, onSelectStep: nav.onSelectStep };
      }
      return nav;
    });
  }, []);

  function goToFolder() {
    router.push(folderPath(folderId));
  }

  const editorTitle =
    video?.phaseA?.localizedTitle ||
    (video ? t("video.workspace.fallbackVideo") : t("video.workspace.fallbackNewVideo"));

  return (
    <>
      <VideoEditorDialog
        folderId={folderId}
        title={editorTitle}
        videoId={video?.id}
        credits={credits}
        creditLimit={creditLimit}
        nav={stepNav ? <EditorStepSwitch {...stepNav} /> : null}
        canDelete={Boolean(video)}
        onExport={
          stepNav?.clipsReady && stepNav.viewing !== 2
            ? () => stepNav.onSelectStep(2)
            : undefined
        }
        onRestart={stepNav?.canRestart ? stepNav.onRestart : undefined}
        onDelete={() => setDeleteOpen(true)}
      >
        <NewProjectForm
          key={video?.id ?? "new"}
          projectId={folderId}
          skills={skills}
          styles={styles}
          characters={characters}
          initialVideo={video}
          credits={credits}
          subscribed={subscribed}
          onVideoCreated={(next) => {
            setVideo(next);
            router.replace(folderVideoPath(folderId, next.id));
          }}
          onStepNav={onStepNav}
        />
      </VideoEditorDialog>
      {deleteOpen && video ? (
        <DeleteVideoDialog
          video={video}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => {
            setDeleteOpen(false);
            goToFolder();
          }}
        />
      ) : null}
    </>
  );
}
