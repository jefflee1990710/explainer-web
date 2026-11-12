"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TaskListDialog } from "@/presentation/components/app/tasks/task-list-dialog";
import {
  BulkGenerateDialog,
  type BulkMode,
} from "@/presentation/components/project/bulk-generate-dialog";
import {
  AppendDirectorDialog,
  type AppendDirectorDialogMode,
  type AppendDirectorSubmitPayload,
} from "@/presentation/components/app/projects/new/append-director-dialog";
import { OpenCutAddClipModal } from "@/presentation/components/app/projects/new/opencut-add-clip-modal";
import { resolvePlayheadInsertSlot } from "@/opencut/timeline/playhead-slot";
import { SelectionBar } from "@/presentation/components/project/selection-bar";
import { EditorReRecordVoDialog } from "@/presentation/components/app/projects/new/editor-rerecord-vo-dialog";
import { OpenCutAiToolbarActions } from "@/presentation/components/app/projects/new/opencut-ai-toolbar-actions";
import { VideoStageStepper } from "@/presentation/components/app/projects/new/video-stage-stepper";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ScroVideoQueue } from "@/opencut/embed/scro-video-queue";
import { scroHost } from "@/opencut/embed/scro-transport";
import type { ScroClipMenuAction } from "@/opencut/embed/scro-video-actions";
import { inFlightCounts } from "@/service/clip-stage";
import { allFramesReady } from "@/service/production-plan";
import { mediaSrc } from "@/util/media-src";
import { appendDirectorClipAction } from "@/presentation/actions/clip-timeline";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type {
  PublicCharacter,
  PublicProduct,
  PublicSkill,
  PublicStyle,
  PublicVideo,
} from "@/presentation/serialize";

// Select label: clip number, plus a short story beat when the director wrote one.
function clipOptionTitle(label: string, narrativeJob: string) {
  const job = narrativeJob.trim();
  if (!job) return label;
  const short = job.length > 36 ? `${job.slice(0, 36)}…` : job;
  return `${label} · ${short}`;
}

/** Bulk / queue / add-clip chrome above the OpenCut editor. */
export function OpenCutScroToolbar({
  project,
  skills = [],
  styles = [],
  characters = [],
  products = [],
  credits,
  subscribed = true,
  pending,
  checkedClipNumbers,
  selectedClipNumber,
  onBulkGenerate,
  onGenerateSelected,
  onClearChecked,
  onProject,
  onOpenClipSwap,
  onOpenClipTeleport,
}: {
  project: PublicVideo;
  skills?: PublicSkill[];
  styles?: PublicStyle[];
  characters?: PublicCharacter[];
  products?: PublicProduct[];
  credits: number;
  subscribed?: boolean;
  pending: string;
  checkedClipNumbers: number[];
  selectedClipNumber: number | null;
  onBulkGenerate: (mode: BulkMode) => Promise<boolean>;
  onGenerateSelected: (clipNumbers: number[], kind: "frames" | "videos") => Promise<boolean>;
  onClearChecked: () => void;
  onProject: (project: PublicVideo) => void;
  onOpenClipSwap?: (clipNumber: number) => void;
  onOpenClipTeleport?: (clipNumber: number) => void;
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const selectedClipDoc =
    selectedClipNumber != null
      ? project.clips.find((c) => c.clipNumber === selectedClipNumber)
      : undefined;
  const selectedClipReadyForJutsu = Boolean(
    selectedClipDoc &&
      selectedClipDoc.status === "completed" &&
      mediaSrc(selectedClipDoc),
  );
  const queue = inFlightCounts(project);
  const appends = project.clipAppends ?? [];
  const clipsQueued = appends.filter((job) => job.status === "queued").length;
  const clipsWriting = appends.filter((job) => job.status === "writing").length;
  const clipsFailed = appends.filter((job) => job.status === "failed").length;
  const idle = pending === "";
  const [tasksOpen, setTasksOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode | null>(null);
  const [appendMode, setAppendMode] = useState<AppendDirectorDialogMode | null>(null);
  const [timelineAddClipOpen, setTimelineAddClipOpen] = useState(false);
  const [timelineInsertAt, setTimelineInsertAt] = useState<number>(1);
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState("");
  const clips = useMemo(() => project.phaseA?.clips ?? [], [project.phaseA?.clips]);

  async function runSelected(clipNumbers: number[], kind: "frames" | "videos") {
    if (await onGenerateSelected(clipNumbers, kind)) onClearChecked();
  }

  async function confirmAppend(payload: AppendDirectorSubmitPayload) {
    if (addPending) return;
    setAddPending(true);
    setAddError("");
    // Slot is the clip after the one whose ending scene seeds the new opening.
    const insertAt =
      payload.mode === "full_video"
        ? clips.length + 1
        : (payload.afterClipNumber ?? clips.at(-1)?.clipNumber ?? 0) + 1;
    const result = await appendDirectorClipAction({
      videoId: project.id,
      content: payload.content,
      spokenScript: payload.spokenScript,
      insertAt,
      mode: payload.mode,
      skillSlug: payload.skillSlug,
      styleId: payload.styleId,
      characterIds: payload.characterIds,
      characterSelections: payload.characterSelections,
      productIds: payload.productIds,
      language: payload.language,
      voiceGender: payload.voiceGender,
      speechPace: payload.speechPace,
      sceneTextLanguage: payload.sceneTextLanguage,
      durationPreset: payload.durationPreset,
      directorBackgroundId: payload.directorBackgroundId,
      backgroundImageUrls: payload.backgroundImageUrls,
      talkingHeadPoseId: payload.talkingHeadPoseId,
      logoUrl: payload.logoUrl,
      uploadedVoUrl: payload.uploadedVoUrl,
      uploadedVoDurationSeconds: payload.uploadedVoDurationSeconds,
    });
    setAddPending(false);
    if (!result.ok) {
      setAddError(translateAppError(result.error, t));
      return;
    }
    onProject(result.project);
    notifyTasksChanged();
    setAppendMode(null);
  }

  const videosEnabled = allFramesReady(project);
  const idleRef = useRef(idle);
  const videosEnabledRef = useRef(videosEnabled);
  const clipsRef = useRef(clips);
  useLayoutEffect(() => {
    idleRef.current = idle;
    videosEnabledRef.current = videosEnabled;
    clipsRef.current = clips;
  }, [idle, videosEnabled, clips]);

  // Assets header menu asks for the same dialogs that used to be buttons here.
  useEffect(() => {
    const host = scroHost();
    if (!host) return;
    return host.subscribeScro((payload) => {
      const data = payload as {
        type?: string;
        videoId?: string;
        action?: ScroClipMenuAction;
        playheadSeconds?: number;
        activeClipNumber?: number;
      };
      if (data?.type === "scro-timeline-add-clip") {
        const currentClips = clipsRef.current;
        const targetSlot = resolvePlayheadInsertSlot({
          playheadSeconds: Number(data.playheadSeconds) || 0,
          clipDurations: currentClips.map((c) => ({
            clipNumber: c.clipNumber,
            durationSeconds: c.durationSeconds,
          })),
          activeClipNumber: data.activeClipNumber,
        });
        setTimelineInsertAt(targetSlot);
        setTimelineAddClipOpen(true);
        return;
      }
      if (data?.type !== "scro-clip-menu" || data.videoId !== project.id || !data.action) return;
      if (!idleRef.current) return;
      if (data.action === "remaining" || data.action === "scenes") {
        setBulkMode(data.action);
        return;
      }
      if (data.action === "clips") {
        if (!videosEnabledRef.current) return;
        setBulkMode("clips");
        return;
      }
      if (data.action === "add") {
        setAddError("");
        setAppendMode("add-clip");
        return;
      }
      if (data.action === "add-video") {
        setAddError("");
        setAppendMode("add-video");
      }
    });
  }, [project.id]);

  return (
    <>
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-3 py-1.5 text-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <VideoStageStepper project={project} onOpenTasks={() => setTasksOpen(true)} />
          <ScroVideoQueue
            {...queue}
            clipsQueued={clipsQueued}
            clipsWriting={clipsWriting}
            clipsFailed={clipsFailed}
            onOpen={() => setTasksOpen(true)}
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedClipNumber != null && selectedClipReadyForJutsu ? (
            <>
              <button
                type="button"
                disabled={!idle}
                onClick={() => onOpenClipSwap?.(selectedClipNumber)}
                className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[var(--studio-line)] bg-[var(--studio-fill)] px-2.5 text-xs font-semibold text-[var(--studio-ink)] transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{isEn ? `Scro Swap #${selectedClipNumber}` : `Scro Swap 換角 #${selectedClipNumber}`}</span>
              </button>
              <button
                type="button"
                disabled={!idle}
                onClick={() => onOpenClipTeleport?.(selectedClipNumber)}
                className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[var(--studio-line)] bg-[var(--studio-fill)] px-2.5 text-xs font-semibold text-[var(--studio-ink)] transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{isEn ? `Teleport #${selectedClipNumber}` : `Teleport 換場 #${selectedClipNumber}`}</span>
              </button>
            </>
          ) : null}
          <EditorReRecordVoDialog
            project={project}
            selectedClipNumber={selectedClipNumber}
            credits={credits}
            busy={!idle}
            onProject={onProject}
          />
          <OpenCutAiToolbarActions project={project} />
        </div>
        {tasksOpen ? (
          <TaskListDialog videoId={project.id} onClose={() => setTasksOpen(false)} />
        ) : null}
      </div>
      {checkedClipNumbers.length > 0 ? (
        <SelectionBar
          project={project}
          clipNumbers={checkedClipNumbers}
          credits={credits}
          pending={pending === "bulk"}
          busy={!idle}
          onFrames={(clipNumbers) => void runSelected(clipNumbers, "frames")}
          onVideos={(clipNumbers) => void runSelected(clipNumbers, "videos")}
          onClear={onClearChecked}
        />
      ) : null}
      {bulkMode ? (
        <BulkGenerateDialog
          project={project}
          mode={bulkMode}
          credits={credits}
          pending={
            pending === "bulk" ||
            pending === "all-scenes" ||
            pending === "all-clips" ||
            pending === "remaining"
          }
          onCancel={() => setBulkMode(null)}
          onConfirm={(mode) => {
            setBulkMode(null);
            void onBulkGenerate(mode);
          }}
        />
      ) : null}
      {appendMode ? (
        <AppendDirectorDialog
          mode={appendMode}
          project={project}
          skills={skills}
          styles={styles}
          characters={characters}
          products={products}
          credits={credits}
          subscribed={subscribed}
          pending={addPending}
          error={addError}
          afterOptions={clips.map((clip) => ({
            clipNumber: clip.clipNumber,
            title: clipOptionTitle(
              t("production.filmstrip.addAfterOption", { n: clip.clipNumber }),
              clip.narrativeJob,
            ),
          }))}
          defaultAfterClipNumber={selectedClipNumber ?? clips.at(-1)?.clipNumber}
          onCancel={() => {
            if (addPending) return;
            setAppendMode(null);
            setAddError("");
          }}
          onConfirm={(payload) => void confirmAppend(payload)}
        />
      ) : null}
      {timelineAddClipOpen ? (
        <OpenCutAddClipModal
          open={timelineAddClipOpen}
          defaultInsertAt={timelineInsertAt}
          project={project}
          skills={skills}
          styles={styles}
          characters={characters}
          products={products}
          credits={credits}
          subscribed={subscribed}
          onClose={() => setTimelineAddClipOpen(false)}
          onProject={onProject}
          onAppendDirector={confirmAppend}
        />
      ) : null}
    </>
  );
}
