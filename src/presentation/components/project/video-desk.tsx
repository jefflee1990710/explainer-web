"use client";

import { useState } from "react";
import { pageVideos, pauseAllVideos } from "@/presentation/components/project/exclusive-video";
import { ClipPlaybackProvider } from "@/presentation/components/project/clip-video-player";
import { clipStudioItems } from "@/presentation/components/project/clip-timeline";
import { Filmstrip } from "@/presentation/studio/filmstrip";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { clipStatesFor, defaultSelectedClip, type ClipState } from "@/service/clip-stage";
import type { PublicVideo } from "@/presentation/serialize";

// Jumps the desk to another clip (e.g. "下一段", progress summary).
export type SelectClip = (clipNumber: number) => void;

// Preview and inspector, with clip selection on the filmstrip. Batch props
// (`checkedIds` / `onToggleCheck`) add checkboxes to the filmstrip.
export function VideoDesk({
  project,
  pending = "",
  renderPreview,
  renderInspector,
  renderToolbar,
  checkedIds,
  onToggleCheck,
  timelineBar,
}: {
  project: PublicVideo;
  pending?: string;
  renderPreview: (state: ClipState, select: SelectClip) => React.ReactNode;
  renderInspector: (state: ClipState, select: SelectClip) => React.ReactNode;
  renderToolbar?: (select: SelectClip) => React.ReactNode;
  checkedIds?: string[];
  onToggleCheck?: (id: string) => void;
  timelineBar?: React.ReactNode;
}) {
  const states = clipStatesFor(project);
  const [selectedClip, setSelectedClip] = useState(() => defaultSelectedClip(states));
  // Each clip select asks the preview to play that clip with sound.
  const [playToken, setPlayToken] = useState(0);

  const selected = states.find((state) => state.clipNumber === selectedClip) ?? states[0];
  const items = clipStudioItems(project, states, pending);

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

  return (
    <ClipPlaybackProvider token={playToken}>
      <StudioFrame
        toolbar={renderToolbar?.(selectClip)}
        preview={selected ? renderPreview(selected, selectClip) : null}
        inspector={selected ? renderInspector(selected, selectClip) : null}
        timelineBar={timelineBar}
        timeline={
          <Filmstrip
            items={items}
            selectedId={selected ? String(selected.clipNumber) : ""}
            onSelect={onSelect}
            checkedIds={checkedIds}
            onToggleCheck={onToggleCheck}
          />
        }
      />
    </ClipPlaybackProvider>
  );
}
