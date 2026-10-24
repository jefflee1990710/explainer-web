"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TaskListDialog } from "@/presentation/components/app/tasks/task-list-dialog";
import {
  BulkGenerateDialog,
  type BulkMode,
} from "@/presentation/components/project/bulk-generate-dialog";
import { AddClipDialog } from "@/presentation/components/project/add-clip-dialog";
import { SelectionBar } from "@/presentation/components/project/selection-bar";
import { OpenCutAiToolbarActions } from "@/presentation/components/app/projects/new/opencut-ai-toolbar-actions";
import { VideoStageStepper } from "@/presentation/components/app/projects/new/video-stage-stepper";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ScroVideoQueue } from "@/opencut/embed/scro-video-queue";
import { scroHost } from "@/opencut/embed/scro-transport";
import type { ScroClipMenuAction } from "@/opencut/embed/scro-video-actions";
import { inFlightCounts } from "@/service/clip-stage";
import { allFramesReady } from "@/service/production-plan";
import { appendDirectorClipAction } from "@/presentation/actions/clip-timeline";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { PublicVideo } from "@/presentation/serialize";

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
  credits,
  pending,
  checkedClipNumbers,
  selectedClipNumber,
  onBulkGenerate,
  onGenerateSelected,
  onClearChecked,
  onProject,
}: {
  project: PublicVideo;
  credits: number;
  pending: string;
  checkedClipNumbers: number[];
  selectedClipNumber: number | null;
  onBulkGenerate: (mode: BulkMode) => Promise<boolean>;
  onGenerateSelected: (clipNumbers: number[], kind: "frames" | "videos") => Promise<boolean>;
  onClearChecked: () => void;
  onProject: (project: PublicVideo) => void;
}) {
  const { t } = useI18n();
  const queue = inFlightCounts(project);
  const idle = pending === "";
  const [tasksOpen, setTasksOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState("");
  const clips = project.phaseA?.clips ?? [];

  async function runSelected(clipNumbers: number[], kind: "frames" | "videos") {
    if (await onGenerateSelected(clipNumbers, kind)) onClearChecked();
  }

  async function confirmAdd(content: string, afterClipNumber?: number) {
    if (addPending) return;
    setAddPending(true);
    setAddError("");
    // Slot is the clip after the one whose ending scene seeds the new opening.
    const insertAt = (afterClipNumber ?? clips.at(-1)?.clipNumber ?? 0) + 1;
    const result = await appendDirectorClipAction({
      videoId: project.id,
      content,
      insertAt,
    });
    setAddPending(false);
    if (!result.ok) {
      setAddError(translateAppError(result.error, t));
      return;
    }
    onProject(result.project);
    setAddOpen(false);
  }

  const videosEnabled = allFramesReady(project);
  const idleRef = useRef(idle);
  const videosEnabledRef = useRef(videosEnabled);
  useLayoutEffect(() => {
    idleRef.current = idle;
    videosEnabledRef.current = videosEnabled;
  }, [idle, videosEnabled]);

  // Assets header menu asks for the same dialogs that used to be buttons here.
  useEffect(() => {
    const host = scroHost();
    if (!host) return;
    return host.subscribeScro((payload) => {
      const data = payload as { type?: string; videoId?: string; action?: ScroClipMenuAction };
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
        setAddOpen(true);
      }
    });
  }, [project.id]);

  return (
    <>
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-3 py-1.5 text-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <VideoStageStepper project={project} onOpenTasks={() => setTasksOpen(true)} />
          <ScroVideoQueue {...queue} onOpen={() => setTasksOpen(true)} />
        </div>
        <OpenCutAiToolbarActions />
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
      {addOpen ? (
        <AddClipDialog
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
            setAddOpen(false);
            setAddError("");
          }}
          onConfirm={(content, afterClipNumber) => void confirmAdd(content, afterClipNumber)}
        />
      ) : null}
    </>
  );
}
