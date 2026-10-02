import { mediaSrc } from "@/util/media-src";
import type { BookendClip } from "@/model/video-edit";

export type TimelineKind = "intro" | "clip" | "outro";

export type EditTimelineItem = {
  id: string;
  kind: TimelineKind;
  clipNumber?: number;
  src?: string;
  poster?: string;
  mediaKind: "video" | "image" | "empty";
  durationSec?: number;
};

export function clipTimelineId(clipNumber: number) {
  return `clip-${clipNumber}`;
}

export function clipNumberFromTimelineId(id: string) {
  const match = /^clip-(\d+)$/.exec(id);
  return match ? Number(match[1]) : undefined;
}

export function isClipTimelineId(id: string) {
  return clipNumberFromTimelineId(id) != null;
}

export function isTimelineBookend(id: string): id is "intro" | "outro" {
  return id === "intro" || id === "outro";
}

function bookendKind(clip?: BookendClip): EditTimelineItem["mediaKind"] {
  return clip?.kind ?? "empty";
}

// Intro, Clip 1…N, Outro. Main is never a slot — clips stay separate until export.
export function buildEditTimeline(input: {
  intro?: BookendClip;
  outro?: BookendClip;
  clips: Array<{ clipNumber: number; blobUrl?: string; outputUrl?: string }>;
  posters?: Array<{ clipNumber: number; src?: string }>;
}): EditTimelineItem[] {
  const posters = new Map((input.posters ?? []).map((row) => [row.clipNumber, row.src]));
  const clips = [...input.clips].sort((a, b) => a.clipNumber - b.clipNumber);
  return [
    {
      id: "intro",
      kind: "intro",
      src: input.intro?.assetUrl,
      mediaKind: bookendKind(input.intro),
      durationSec: input.intro?.durationSec,
    },
    ...clips.map((clip) => {
      const src = mediaSrc(clip);
      return {
        id: clipTimelineId(clip.clipNumber),
        kind: "clip" as const,
        clipNumber: clip.clipNumber,
        src,
        poster: posters.get(clip.clipNumber),
        mediaKind: src ? ("video" as const) : ("empty" as const),
      };
    }),
    {
      id: "outro",
      kind: "outro",
      src: input.outro?.assetUrl,
      mediaKind: bookendKind(input.outro),
      durationSec: input.outro?.durationSec,
    },
  ];
}

export function nextPlayableTimelineId(items: EditTimelineItem[], currentId: string) {
  const index = items.findIndex((item) => item.id === currentId);
  if (index < 0) return undefined;
  return items.slice(index + 1).find((item) => item.src)?.id;
}

export function defaultTimelineId(items: EditTimelineItem[]) {
  return (
    items.find((item) => item.kind === "clip" && item.src)?.id ??
    items.find((item) => item.src)?.id ??
    items.find((item) => item.kind === "clip")?.id ??
    "intro"
  );
}

export function clipUrlsForExport(
  clips: Array<{ clipNumber: number; blobUrl?: string; outputUrl?: string }>,
) {
  return [...clips]
    .sort((a, b) => a.clipNumber - b.clipNumber)
    .map((clip) => mediaSrc(clip))
    .filter((url): url is string => Boolean(url));
}

// Storyboard numbers stay on the timeline even before a clip video exists.
export function timelineClips(project: {
  phaseA?: { clips?: Array<{ clipNumber: number }> };
  clips: Array<{ clipNumber: number; blobUrl?: string; outputUrl?: string }>;
}) {
  const numbers = new Set<number>();
  for (const row of project.phaseA?.clips ?? []) numbers.add(row.clipNumber);
  for (const clip of project.clips) numbers.add(clip.clipNumber);
  return [...numbers]
    .sort((a, b) => a - b)
    .map((clipNumber) => {
      const clip = project.clips.find((item) => item.clipNumber === clipNumber);
      return { clipNumber, blobUrl: clip?.blobUrl, outputUrl: clip?.outputUrl };
    });
}
