"use client";

import { useState } from "react";
import { TaskListDialog } from "@/presentation/components/app/tasks/task-list-dialog";
import {
  BulkGenerateDialog,
  type BulkMode,
} from "@/presentation/components/project/bulk-generate-dialog";
import { AddClipDialog } from "@/presentation/components/project/add-clip-dialog";
import { DeleteClipDialog } from "@/presentation/components/project/delete-clip-dialog";
import { SelectionBar } from "@/presentation/components/project/selection-bar";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ScroVideoQueue } from "@/opencut/embed/scro-video-queue";
import { StudioButton } from "@/presentation/studio/studio-button";
import {
  clipStatesFor,
  inFlightCounts,
  productionCounts,
} from "@/service/clip-stage";
import { allFramesReady } from "@/service/production-plan";
import { appendDirectorClipAction, deleteClipAction } from "@/presentation/actions/clip-timeline";
import { removeClip } from "@/service/clip/clip-order";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { PublicVideo } from "@/presentation/serialize";

/** Bulk / queue / add / delete chrome above the OpenCut editor. */
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
  const counts = productionCounts(project);
  const queue = inFlightCounts(project);
  const idle = pending === "";
  const [tasksOpen, setTasksOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const clipCount = project.phaseA?.clips.length ?? 0;
  const deleteTarget = selectedClipNumber;

  async function runSelected(clipNumbers: number[], kind: "frames" | "videos") {
    if (await onGenerateSelected(clipNumbers, kind)) onClearChecked();
  }

  async function confirmAdd(content: string) {
    if (addPending) return;
    setAddPending(true);
    setAddError("");
    const insertAt = clipCount + 1;
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

  async function confirmDelete() {
    if (deletePending || deleteTarget == null) return;
    const removed = removeClip(project, deleteTarget, { language: project.language });
    if (!removed.ok) {
      setDeleteError(translateAppError(removed.error, t));
      return;
    }
    setDeletePending(true);
    setDeleteError("");
    const result = await deleteClipAction(project.id, deleteTarget);
    setDeletePending(false);
    if (!result.ok) {
      setDeleteError(translateAppError(result.error, t));
      return;
    }
    onClearChecked();
    onProject(result.project);
    setDeleteOpen(false);
  }

  const firstUnfinished = clipStatesFor(project).find(
    (state) => state.stage !== "video_ready" || state.stale.frames || state.stale.video,
  )?.clipNumber;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] px-3 py-2 text-xs">
        <button
          type="button"
          disabled={firstUnfinished === undefined}
          className="flex cursor-pointer items-center gap-2 disabled:cursor-default disabled:opacity-50"
          title={
            firstUnfinished !== undefined
              ? t("production.toolbar.jumpToClip", { n: firstUnfinished })
              : undefined
          }
        >
          <span className="font-semibold">
            {t("production.toolbar.progressFrames")} {counts.framesDone}/{counts.total}
          </span>
          <span className="font-semibold">
            {t("production.toolbar.progressVideos")} {counts.videosDone}/{counts.total}
          </span>
        </button>
        <ScroVideoQueue {...queue} onOpen={() => setTasksOpen(true)} />
        {tasksOpen ? (
          <TaskListDialog videoId={project.id} onClose={() => setTasksOpen(false)} />
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <StudioButton
            variant="ghost"
            className="min-h-8 px-2 text-xs"
            disabled={!idle}
            onClick={() => setBulkMode("remaining")}
          >
            {t("production.bulk.mode.remaining.label")}
          </StudioButton>
          <StudioButton
            variant="ghost"
            className="min-h-8 px-2 text-xs"
            disabled={!idle}
            onClick={() => setBulkMode("scenes")}
          >
            {t("production.bulk.mode.scenes.label")}
          </StudioButton>
          <StudioButton
            className="min-h-8 px-2 text-xs"
            disabled={!idle || !allFramesReady(project)}
            onClick={() => setBulkMode("clips")}
          >
            {t("production.toolbar.bulkAllVideos")}
          </StudioButton>
          <StudioButton
            variant="ghost"
            className="min-h-8 px-2 text-xs"
            disabled={!idle}
            onClick={() => {
              setAddError("");
              setAddOpen(true);
            }}
          >
            {t("production.filmstrip.addClip")}
          </StudioButton>
          <StudioButton
            variant="ghost"
            className="min-h-8 px-2 text-xs"
            disabled={!idle || deleteTarget == null}
            onClick={() => {
              setDeleteError("");
              setDeleteOpen(true);
            }}
          >
            {t("production.filmstrip.deleteConfirm")}
          </StudioButton>
        </div>
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
          place={t("production.filmstrip.addClip")}
          pending={addPending}
          error={addError}
          onCancel={() => {
            if (addPending) return;
            setAddOpen(false);
            setAddError("");
          }}
          onConfirm={(content) => void confirmAdd(content)}
        />
      ) : null}
      {deleteOpen && deleteTarget != null ? (
        <DeleteClipDialog
          title={t("production.filmstrip.clipTitle", { n: deleteTarget })}
          pending={deletePending}
          error={deleteError}
          blocked={clipCount <= 1}
          onCancel={() => {
            if (deletePending) return;
            setDeleteOpen(false);
            setDeleteError("");
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </>
  );
}
