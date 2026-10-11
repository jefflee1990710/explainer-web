"use client";

import { useMemo, useRef, useState } from "react";
import {
  appendDirectorClipAction,
  reorderClipsAction,
} from "@/presentation/actions/clip-timeline";
import { AddClipDialog } from "@/presentation/components/project/add-clip-dialog";
import { pageVideos, pauseAllVideos } from "@/presentation/components/project/exclusive-video";
import { ClipPlaybackProvider } from "@/presentation/components/project/clip-video-player";
import { clipStudioItems } from "@/presentation/components/project/clip-timeline";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Filmstrip } from "@/presentation/studio/filmstrip";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { applyClipOrder, moveClipIds } from "@/service/clip/clip-order";
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
}) {
  const { t } = useI18n();
  const states = clipStatesFor(project);
  const [selectedClip, setSelectedClip] = useState(() => defaultSelectedClip(states));
  const [playToken, setPlayToken] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState("");
  const [reorderError, setReorderError] = useState("");
  const savingOrder = useRef(false);

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

  async function reorder(fromId: string, toId: string) {
    if (!onProject || savingOrder.current) return;
    const order = moveClipIds(
      items.map((item) => item.id),
      fromId,
      toId,
    ).map(Number);
    if (order.every((clipNumber, index) => clipNumber === index + 1)) return;
    const moved = applyClipOrder(project, order);
    if (!moved.ok) {
      setReorderError(moved.error);
      return;
    }
    const previous = project;
    const previousClip = selectedClip;
    savingOrder.current = true;
    setReorderError("");
    onProject(moved.project);
    setSelectedClip(Math.max(1, order.indexOf(previousClip) + 1));
    const result = await reorderClipsAction(project.id, order);
    savingOrder.current = false;
    if (!result.ok) {
      onProject(previous);
      setSelectedClip(previousClip);
      setReorderError(result.error);
      return;
    }
    onProject(result.project);
  }

  async function addClip(content: string) {
    if (!onProject || addPending) return;
    setAddPending(true);
    setAddError("");
    const result = await appendDirectorClipAction({ videoId: project.id, content });
    setAddPending(false);
    if (!result.ok) {
      setAddError(result.error);
      return;
    }
    onProject(result.project);
    const last = result.project.phaseA?.clips.at(-1)?.clipNumber;
    if (last) selectClip(last);
    setAddOpen(false);
  }

  const bar = reorderError ? (
    <>
      {timelineBar}
      <p className="px-3 py-1 text-xs text-accent">{reorderError}</p>
    </>
  ) : (
    timelineBar
  );

  return (
    <ClipPlaybackProvider token={playToken}>
      <StudioFrame
        toolbar={renderToolbar?.(selectClip)}
        preview={selected ? renderPreview(selected, selectClip) : null}
        inspector={selected ? renderInspector(selected, selectClip) : null}
        aside={selected ? renderAside?.(selected) : null}
        timelineBar={bar}
        timeline={
          <Filmstrip
            items={items}
            selectedId={selected ? String(selected.clipNumber) : ""}
            aspectRatio={project.aspectRatio}
            onSelect={onSelect}
            checkedIds={checkedIds}
            onToggleCheck={onToggleCheck}
            onReorder={onProject ? reorder : undefined}
            onAdd={onProject ? () => setAddOpen(true) : undefined}
          />
        }
      />
      {addOpen ? (
        <AddClipDialog
          pending={addPending}
          error={addError}
          onCancel={() => {
            if (addPending) return;
            setAddOpen(false);
            setAddError("");
          }}
          onConfirm={(content) => void addClip(content)}
        />
      ) : null}
    </ClipPlaybackProvider>
  );
}
