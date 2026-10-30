"use client";

import { useMemo, useState } from "react";
import {
  appendDirectorClipAction,
  deleteClipAction,
} from "@/presentation/actions/clip-timeline";
import { AddClipDialog } from "@/presentation/components/project/add-clip-dialog";
import { DeleteClipDialog } from "@/presentation/components/project/delete-clip-dialog";
import { pageVideos, pauseAllVideos } from "@/presentation/components/project/exclusive-video";
import { ClipPlaybackProvider } from "@/presentation/components/project/clip-video-player";
import { clipStudioItems } from "@/presentation/components/project/clip-timeline";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Filmstrip } from "@/presentation/studio/filmstrip";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { removeClip, selectedClipAfterRemoval } from "@/service/clip/clip-order";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { clipStatesFor, defaultSelectedClip, type ClipState } from "@/service/clip-stage";
import type { PublicVideo } from "@/presentation/serialize";

export type SelectClip = (clipNumber: number) => void;

export function VideoDesk({
  project,
  pending = "",
  renderPreview,
  renderInspector,
  renderAside,
  renderToolbar,
  checkedIds,
  onToggleCheck,
  timelineBar,
  onProject,
  onDeleted,
}: {
  project: PublicVideo;
  pending?: string;
  renderPreview: (state: ClipState, select: SelectClip) => React.ReactNode;
  renderInspector: (state: ClipState, select: SelectClip) => React.ReactNode;
  renderAside?: (state: ClipState) => React.ReactNode;
  renderToolbar?: (select: SelectClip) => React.ReactNode;
  checkedIds?: string[];
  onToggleCheck?: (id: string) => void;
  timelineBar?: React.ReactNode;
  onProject?: (project: PublicVideo) => void;
  onDeleted?: () => void;
}) {
  const { t } = useI18n();
  const states = clipStatesFor(project);
  const [selectedClip, setSelectedClip] = useState(() => defaultSelectedClip(states));
  const [playToken, setPlayToken] = useState(0);
  const [addSlot, setAddSlot] = useState<number | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const selected = states.find((state) => state.clipNumber === selectedClip) ?? states[0];
  const items = useMemo(
    () =>
      clipStudioItems(project, states, pending, {
        clipTitle: (n) => t("production.filmstrip.clipTitle", { n }),
        stageLabel: (stage) => t(`production.stage.${stage}`),
      }),
    [project, states, pending, t],
  );

  function selectClip(clipNumber: number) {
    pauseAllVideos(pageVideos());
    setSelectedClip(clipNumber);
    setPlayToken((token) => token + 1);
  }

  function onSelect(id: string) {
    const clipNumber = Number(id);
    if (!Number.isFinite(clipNumber)) return;
    selectClip(clipNumber);
  }

  function slotPlace(insertAt: number) {
    const before = items[insertAt - 2];
    const after = items[insertAt - 1];
    if (before && after) {
      return t("production.filmstrip.addBetween", { before: before.title, after: after.title });
    }
    if (after) return t("production.filmstrip.addBefore", { title: after.title });
    if (before) return t("production.filmstrip.addAfter", { title: before.title });
    return t("production.filmstrip.addClip");
  }

  async function confirmDelete() {
    if (!onProject || deletePending || deleteTarget == null) return;
    const clipNumber = deleteTarget;
    const removed = removeClip(project, clipNumber, { language: project.language });
    if (!removed.ok) {
      setDeleteError(translateAppError(removed.error, t));
      return;
    }
    setDeletePending(true);
    setDeleteError("");
    const result = await deleteClipAction(project.id, clipNumber);
    setDeletePending(false);
    if (!result.ok) {
      setDeleteError(translateAppError(result.error, t));
      return;
    }
    onDeleted?.();
    onProject(result.project);
    setSelectedClip(
      selectedClipAfterRemoval(selectedClip, clipNumber, result.project.phaseA?.clips.length ?? 1),
    );
    setDeleteTarget(null);
  }

  async function addClip(content: string) {
    if (!onProject || addPending || addSlot == null) return;
    const insertAt = addSlot;
    setAddPending(true);
    setAddError("");
    const result = await appendDirectorClipAction({ videoId: project.id, content, insertAt });
    setAddPending(false);
    if (!result.ok) {
      setAddError(translateAppError(result.error, t));
      return;
    }
    onDeleted?.();
    onProject(result.project);
    notifyTasksChanged();
    setAddSlot(null);
  }

  return (
    <ClipPlaybackProvider token={playToken}>
      <StudioFrame
        toolbar={renderToolbar?.(selectClip)}
        preview={selected ? renderPreview(selected, selectClip) : null}
        inspector={selected ? renderInspector(selected, selectClip) : null}
        aside={selected ? renderAside?.(selected) : null}
        timelineBar={timelineBar}
        timeline={
          <Filmstrip
            items={items}
            selectedId={selected ? String(selected.clipNumber) : ""}
            aspectRatio={project.aspectRatio}
            onSelect={onSelect}
            checkedIds={checkedIds}
            onToggleCheck={onToggleCheck}
            onAdd={
              onProject
                ? (insertAt) => {
                    setAddError("");
                    setAddSlot(insertAt);
                  }
                : undefined
            }
            onDelete={
              onProject
                ? (id) => {
                    const clipNumber = Number(id);
                    if (!Number.isFinite(clipNumber)) return;
                    setDeleteError("");
                    setDeleteTarget(clipNumber);
                  }
                : undefined
            }
          />
        }
      />
      {deleteTarget != null ? (
        <DeleteClipDialog
          title={t("production.filmstrip.clipTitle", { n: deleteTarget })}
          pending={deletePending}
          error={deleteError}
          blocked={(project.phaseA?.clips.length ?? 0) <= 1}
          onCancel={() => {
            if (deletePending) return;
            setDeleteTarget(null);
            setDeleteError("");
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
      {addSlot != null ? (
        <AddClipDialog
          place={slotPlace(addSlot)}
          pending={addPending}
          error={addError}
          onCancel={() => {
            if (addPending) return;
            setAddSlot(null);
            setAddError("");
          }}
          onConfirm={(content) => void addClip(content)}
        />
      ) : null}
    </ClipPlaybackProvider>
  );
}
