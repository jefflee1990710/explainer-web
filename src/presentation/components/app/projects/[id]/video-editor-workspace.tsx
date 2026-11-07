"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NewProjectForm } from "@/presentation/components/app/projects/new/new-project-form";
import { DeleteVideoDialog } from "@/presentation/components/app/projects/[id]/delete-video-dialog";
import { UseCaseHistoryDialog } from "@/presentation/components/app/projects/[id]/use-case-history-dialog";
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
  PublicVideoCard,
} from "@/presentation/serialize";
import type { ProjectOption } from "@/presentation/components/app/project-picker";
import { folderPath } from "@/service/folder-video-path";
import {
  USE_CASE_LIST_PATH,
  videoMatchesUseCase,
  type VideoUseCase,
} from "@/service/video/use-case";

// Dedicated editor page. Same-tab from the folder list.
export function VideoEditorWorkspace({
  folderId,
  folderName,
  folders = [],
  skills,
  styles,
  characters,
  products,
  textStyles,
  credits,
  subscribed,
  hasAnyVideo = true,
  initialVideo,
  useCase,
  historyVideos,
  allHistoryVideos,
  initialPrompt,
}: {
  folderId: string;
  folderName: string;
  folders?: ProjectOption[];
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  products: PublicProduct[];
  textStyles: PublicTextStyle[];
  credits: number;
  subscribed: boolean;
  hasAnyVideo?: boolean;
  initialVideo: PublicVideo | null;
  /** Create use-case: limit SkillPicker to matching system directors. */
  useCase?: VideoUseCase;
  historyVideos?: PublicVideoCard[];
  allHistoryVideos?: PublicVideoCard[];
  initialPrompt?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [video, setVideo] = useState(initialVideo);
  const [useCaseOverride, setUseCaseOverride] = useState<{
    base: VideoUseCase | undefined;
    next: VideoUseCase;
  } | null>(null);
  const activeUseCase =
    useCaseOverride && useCaseOverride.base === useCase
      ? useCaseOverride.next
      : useCase;
  const handleUseCaseChange = useCallback(
    (next: VideoUseCase) => {
      setUseCaseOverride({ base: useCase, next });
    },
    [useCase],
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [stepNav, setStepNav] = useState<EditorStepNav | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVideo(initialVideo);
  }, [initialVideo]);

  const displayedHistoryVideos = useMemo(() => {
    if (allHistoryVideos && activeUseCase) {
      return allHistoryVideos.filter((v) => videoMatchesUseCase(v.skillSlug, activeUseCase));
    }
    return historyVideos;
  }, [allHistoryVideos, historyVideos, activeUseCase]);

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
      ? `${nav.status}|${nav.viewing}|${nav.phaseAReady}|${nav.failedAtStep ?? ""}|${nav.canRestart}`
      : "";
    if (navKey.current === key) return;
    navKey.current = key;
    setStepNav((current) => {
      if (!nav) return current ? null : current;
      if (
        current &&
        current.status === nav.status &&
        current.viewing === nav.viewing &&
        current.phaseAReady === nav.phaseAReady &&
        current.failedAtStep === nav.failedAtStep &&
        current.canRestart === nav.canRestart
      ) {
        return current;
      }
      return {
        status: nav.status,
        failedAtStep: nav.failedAtStep,
        viewing: nav.viewing,
        phaseAReady: nav.phaseAReady,
        canRestart: nav.canRestart,
        onSelectStep: (step) => stepHandlers.current?.onSelectStep(step),
        onRestart: () => stepHandlers.current?.onRestart(),
      };
    });
  }, []);

  function goToFolder() {
    if (folderId) {
      router.push(folderPath(folderId));
      return;
    }
    if (activeUseCase) {
      router.push(`${USE_CASE_LIST_PATH[activeUseCase]}?stay=1`);
      return;
    }
    router.push(folderPath());
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
        useCase={activeUseCase}
        objectSheetUrl={video?.objectSheetUrl}
        objectSheetItems={video?.objectSheetItems}
        backgroundPlates={video?.backgroundPlates}
        canDelete={Boolean(video)}
        onExport={undefined}
        onRestart={stepNav?.canRestart ? stepNav.onRestart : undefined}
        onDelete={() => setDeleteOpen(true)}
        historyCount={displayedHistoryVideos?.length}
        onOpenHistory={
          displayedHistoryVideos !== undefined ? () => setHistoryOpen(true) : undefined
        }
      >
        <NewProjectForm
          key={video?.id ?? `new-${initialPrompt || ""}`}
          projectId={folderId}
          folders={folders}
          skills={skills}
          styles={styles}
          characters={characters}
          products={products}
          textStyles={textStyles}
          initialVideo={video}
          credits={credits}
          subscribed={subscribed}
          hasAnyVideo={hasAnyVideo || Boolean(video)}
          useCase={activeUseCase}
          onUseCaseChange={handleUseCaseChange}
          initialPrompt={initialPrompt}
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
      {displayedHistoryVideos !== undefined ? (
        <UseCaseHistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          useCase={activeUseCase}
          videos={displayedHistoryVideos ?? []}
          folders={folders}
        />
      ) : null}
    </>
  );
}
