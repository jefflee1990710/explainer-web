"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NewProjectForm } from "@/presentation/components/app/projects/new/new-project-form";
import { DeleteVideoDialog } from "@/presentation/components/app/projects/[id]/delete-video-dialog";
import type { EditorStepNav } from "@/presentation/components/app/projects/[id]/editor-step-switch";
import { VideoEditorDialog } from "@/presentation/components/app/projects/[id]/video-editor-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import type {
  PublicCharacter,
  PublicProduct,
  PublicSkill,
  PublicStyle,
  PublicTextStyle,
  PublicVideo,
} from "@/presentation/serialize";
import { folderPath } from "@/service/folder-video-path";

// Dedicated editor page. Same-tab from the folder list.
export function VideoEditorWorkspace({
  folderId,
  folderName,
  skills,
  styles,
  characters,
  products,
  textStyles,
  credits,
  subscribed,
  initialVideo,
}: {
  folderId: string;
  folderName: string;
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  products: PublicProduct[];
  textStyles: PublicTextStyle[];
  credits: number;
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

  // Latest step handlers. Stored aside so a new function identity does not
  // set state and retrigger the form effect.
  const stepHandlers = useRef<{
    onSelectStep: (step: number) => void;
    onRestart: () => void;
  } | null>(null);

  const navKey = useRef<string | null>(null);
  const onStepNav = useCallback((nav: EditorStepNav | null) => {
    stepHandlers.current = nav
      ? { onSelectStep: nav.onSelectStep, onRestart: nav.onRestart }
      : null;
    const key = nav
      ? `${nav.status}|${nav.viewing}|${nav.clipsReady}|${nav.failedAtStep ?? ""}|${nav.canRestart}`
      : "";
    if (navKey.current === key) return;
    navKey.current = key;
    setStepNav((current) => {
      if (!nav) return current ? null : current;
      if (
        current &&
        current.status === nav.status &&
        current.viewing === nav.viewing &&
        current.clipsReady === nav.clipsReady &&
        current.failedAtStep === nav.failedAtStep &&
        current.canRestart === nav.canRestart
      ) {
        return current;
      }
      return {
        status: nav.status,
        failedAtStep: nav.failedAtStep,
        viewing: nav.viewing,
        clipsReady: nav.clipsReady,
        canRestart: nav.canRestart,
        onSelectStep: (step) => stepHandlers.current?.onSelectStep(step),
        onRestart: () => stepHandlers.current?.onRestart(),
      };
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
        folderName={folderName}
        title={editorTitle}
        videoId={video?.id}
        objectSheetUrl={video?.objectSheetUrl}
        objectSheetItems={video?.objectSheetItems}
        backgroundPlates={video?.backgroundPlates}
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
          products={products}
          textStyles={textStyles}
          initialVideo={video}
          credits={credits}
          subscribed={subscribed}
          onVideoCreated={setVideo}
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
