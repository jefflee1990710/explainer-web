"use client";

import { useMemo, useState } from "react";
import { pageVideos, pauseAllVideos } from "@/presentation/components/project/exclusive-video";
import { ClipPlaybackProvider } from "@/presentation/components/project/clip-video-player";
import { clipStudioItems } from "@/presentation/components/project/clip-timeline";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Filmstrip } from "@/presentation/studio/filmstrip";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { clipStatesFor, defaultSelectedClip, type ClipState } from "@/service/clip-stage";
import type { PublicVideo } from "@/presentation/serialize";

export type SelectClip = (clipNumber: number) => void;

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
  const { t } = useI18n();
  const states = clipStatesFor(project);
  const [selectedClip, setSelectedClip] = useState(() => defaultSelectedClip(states));
  const [playToken, setPlayToken] = useState(0);

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
