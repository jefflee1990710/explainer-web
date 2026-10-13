import type { SubtitlePlate } from "@/model/project";
import { plateLineStale } from "@/service/video-edit/subtitle-export";

export type OpencutSubtitlePlateReady = { clipNumber: number; url: string };

// Which clips already have a usable plate vs still generating vs need a new job.
export function classifyOpencutSubtitlePlates(input: {
  clips: Array<{ clipNumber: number; englishVo?: string }>;
  plates: SubtitlePlate[] | undefined;
  clipNumbers: number[];
  styleChanged: boolean;
}): {
  ready: OpencutSubtitlePlateReady[];
  pending: number[];
  toEnqueue: number[];
  failed: Array<{ clipNumber: number; error: string }>;
} {
  const ready: OpencutSubtitlePlateReady[] = [];
  const pending: number[] = [];
  const toEnqueue: number[] = [];
  const failed: Array<{ clipNumber: number; error: string }> = [];
  const clipByNumber = new Map(input.clips.map((clip) => [clip.clipNumber, clip]));

  for (const clipNumber of input.clipNumbers) {
    const clip = clipByNumber.get(clipNumber);
    const plate = input.plates?.find((item) => item.clipNumber === clipNumber);
    const line = clip?.englishVo;

    if (
      !input.styleChanged &&
      plate?.status === "completed" &&
      plate.blobUrl &&
      !plateLineStale(plate, line)
    ) {
      ready.push({ clipNumber, url: plate.blobUrl });
      continue;
    }

    if (plate?.status === "queued" || plate?.status === "in_progress") {
      pending.push(clipNumber);
      continue;
    }

    if (plate?.status === "failed" && plate.error) {
      failed.push({ clipNumber, error: plate.error });
    }

    toEnqueue.push(clipNumber);
  }

  return { ready, pending, toEnqueue, failed };
}

export function opencutSubtitleStyleChanged(
  before: { textStyleId?: string; textStyleImageUrl?: string },
  after: { textStyleId: string; textStyleImageUrl?: string },
) {
  if (before.textStyleId !== after.textStyleId) return true;
  return (before.textStyleImageUrl ?? "") !== (after.textStyleImageUrl ?? "");
}
