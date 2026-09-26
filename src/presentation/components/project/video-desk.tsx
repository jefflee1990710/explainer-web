"use client";

import { useState } from "react";
import { clipStudioItems } from "@/presentation/components/project/clip-timeline";
import { Filmstrip } from "@/presentation/studio/filmstrip";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { clipStatesFor, defaultSelectedClip, type ClipState } from "@/service/clip-stage";
import type { PublicVideo } from "@/presentation/serialize";

// Preview and inspector, with clip selection on the filmstrip.
export function VideoDesk({
  project,
  pending = "",
  renderPreview,
  renderInspector,
}: {
  project: PublicVideo;
  pending?: string;
  renderPreview: (state: ClipState) => React.ReactNode;
  renderInspector: (state: ClipState) => React.ReactNode;
}) {
  const states = clipStatesFor(project);
  const [selectedClip, setSelectedClip] = useState(() => defaultSelectedClip(states));

  const selected = states.find((state) => state.clipNumber === selectedClip) ?? states[0];
  const items = clipStudioItems(project, states, pending);

  function onSelect(id: string) {
    const clipNumber = Number(id);
    if (Number.isFinite(clipNumber)) setSelectedClip(clipNumber);
  }

  return (
    <StudioFrame
      preview={selected ? renderPreview(selected) : null}
      inspector={selected ? renderInspector(selected) : null}
      timeline={
        <Filmstrip
          items={items}
          selectedId={selected ? String(selected.clipNumber) : ""}
          onSelect={onSelect}
        />
      }
    />
  );
}
