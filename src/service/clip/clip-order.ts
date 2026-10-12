import type { PhaseAProposal, StoryboardRow, VoLanguage } from "@/model/project";
import { spokenUnits } from "@/service/director/phase-a-edit";
import { clipNumberFromTimelineId, clipTimelineId } from "@/service/video-edit/edit-timeline";

const NORMAL_MIN_SECONDS = 3;
const NORMAL_MAX_SECONDS = 8;
const TALKING_MIN_SECONDS = 1;
const TALKING_MAX_SECONDS = 12;

type Numbered = { clipNumber: number };

// Fields that follow a clip when the filmstrip order changes.
export type ClipOrderProject = {
  phaseA?: {
    clips: StoryboardRow[];
    clipCount: number;
    targetDuration: string;
    englishWordCount: number;
  };
  clips: Numbered[];
  frames?: Numbered[];
  // Keyed subtitle plates follow their clip like frames do.
  subtitlePlates?: Numbered[];
  sceneChats?: Array<{
    clipNumber: number;
    messages: Array<{ changedClips?: Numbered[] }>;
  }>;
  backgroundPlates?: Array<{ setId?: string; clipNumbers: number[] }>;
  phaseB?: { prompts: Numbered[] };
  autoVideoClips?: number[];
  edit?: { transitions?: Record<string, unknown> };
};

// Move `fromId` into the slot of `toId`. Dragging right lands after the target.
export function moveClipIds(ids: string[], fromId: string, toId: string) {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  const [item] = next.splice(from, 1);
  const toIndex = next.indexOf(toId);
  next.splice(from < to ? toIndex + 1 : toIndex, 0, item);
  return next;
}

export function clampClipDuration(seconds: number, talkingHead = false) {
  const min = talkingHead ? TALKING_MIN_SECONDS : NORMAL_MIN_SECONDS;
  const max = talkingHead ? TALKING_MAX_SECONDS : NORMAL_MAX_SECONDS;
  const rounded = Math.round(seconds);
  if (!Number.isFinite(rounded)) return min;
  return Math.min(max, Math.max(min, rounded));
}

// Append one storyboard row and give it the next number and time range.
export function placeAppendedClip(
  phaseA: PhaseAProposal,
  row: StoryboardRow,
  options?: { language?: VoLanguage; talkingHead?: boolean },
): PhaseAProposal {
  const start = phaseA.clips.reduce((sum, clip) => sum + clip.durationSeconds, 0);
  const durationSeconds = clampClipDuration(row.durationSeconds, options?.talkingHead);
  const clip: StoryboardRow = {
    ...row,
    clipNumber: phaseA.clips.length + 1,
    durationSeconds,
    timeRange: `${start}–${start + durationSeconds}s`,
  };
  const clips = [...phaseA.clips, clip];
  const total = clips.reduce((sum, item) => sum + item.durationSeconds, 0);
  return {
    ...phaseA,
    clips,
    clipCount: clips.length,
    targetDuration: `${total}s`,
    englishWordCount: Math.max(
      1,
      clips.reduce((sum, item) => sum + spokenUnits(item.englishVo, options?.language), 0),
    ),
  };
}

function bumpMap(numbers: number[], insertAt: number, added: number) {
  return new Map(numbers.map((number) => [number, number >= insertAt ? number + added : number]));
}

// Insert drafted rows at `insertAt` (1 = before the first clip) and shift later clips.
export function insertClips<T extends ClipOrderProject>(
  project: T,
  rows: StoryboardRow[],
  insertAt: number,
  options?: { language?: VoLanguage; talkingHead?: boolean },
): { ok: true; project: T } | { ok: false; error: string } {
  const current = [...(project.phaseA?.clips ?? [])].sort((a, b) => a.clipNumber - b.clipNumber);
  if (!project.phaseA || rows.length < 1 || insertAt < 1 || insertAt > current.length + 1) {
    return { ok: false, error: "插入位置不正確" };
  }
  const added = rows.length;
  const map = bumpMap(
    current.map((clip) => clip.clipNumber),
    insertAt,
    added,
  );
  const previous = current.find((clip) => clip.clipNumber === insertAt - 1);
  const following = current.find((clip) => clip.clipNumber === insertAt);
  const setId = previous?.backgroundSetId || following?.backgroundSetId;
  const prepared = rows.map((row, index) => ({
    ...row,
    clipNumber: insertAt + index,
    durationSeconds: clampClipDuration(row.durationSeconds, options?.talkingHead),
    ...(setId ? { backgroundSetId: setId } : {}),
  }));
  const bumped = current.map((clip) => ({
    ...clip,
    clipNumber: map.get(clip.clipNumber) ?? clip.clipNumber,
  }));
  const clips = withTimeRanges([
    ...bumped.filter((clip) => clip.clipNumber < insertAt),
    ...prepared,
    ...bumped.filter((clip) => clip.clipNumber >= insertAt),
  ]);
  const total = clips.reduce((sum, clip) => sum + clip.durationSeconds, 0);
  const phaseA = {
    ...project.phaseA,
    clips,
    clipCount: clips.length,
    targetDuration: `${total}s`,
    englishWordCount: Math.max(
      1,
      clips.reduce((sum, clip) => sum + spokenUnits(clip.englishVo, options?.language), 0),
    ),
  };
  const newNumbers = prepared.map((clip) => clip.clipNumber);
  const cleared = {
    ...project,
    phaseA,
    clips: renumber(project.clips, map),
    frames: project.frames ? renumber(project.frames, map) : project.frames,
    subtitlePlates: project.subtitlePlates
      ? renumber(project.subtitlePlates, map)
      : project.subtitlePlates,
    sceneChats: project.sceneChats?.map((thread) => ({
      ...thread,
      clipNumber: map.get(thread.clipNumber) ?? thread.clipNumber,
      messages: thread.messages.map((message) => ({
        ...message,
        changedClips: message.changedClips?.map((change) => ({
          ...change,
          clipNumber: map.get(change.clipNumber) ?? change.clipNumber,
        })),
      })),
    })),
    backgroundPlates: project.backgroundPlates?.map((plate) => {
      const clipNumbers = plate.clipNumbers.map((number) => map.get(number) ?? number);
      if (setId && plate.setId === setId) {
        for (const number of newNumbers) {
          if (!clipNumbers.includes(number)) clipNumbers.push(number);
        }
      }
      return { ...plate, clipNumbers };
    }),
    phaseB: project.phaseB
      ? { ...project.phaseB, prompts: renumber(project.phaseB.prompts, map) }
      : project.phaseB,
    autoVideoClips: project.autoVideoClips?.map((number) => map.get(number) ?? number),
    edit: project.edit?.transitions
      ? { ...project.edit, transitions: remapTransitions(project.edit.transitions, map) }
      : project.edit,
  };
  const withReel = cleared as T & {
    reelUrl?: string;
    reelStatus?: string;
    reelFingerprint?: string;
    reelError?: string;
    reelStep?: unknown;
    reelAttempts?: number;
  };
  withReel.reelUrl = undefined;
  withReel.reelStatus = undefined;
  withReel.reelFingerprint = undefined;
  withReel.reelError = undefined;
  withReel.reelStep = undefined;
  withReel.reelAttempts = undefined;
  return { ok: true, project: cleared };
}

// A new clip stays in the same empty set as the clip it follows.
export function keepAppendedClipOnPreviousSet<
  T extends {
    phaseA?: PhaseAProposal;
    backgroundPlates?: Array<{ setId: string; clipNumbers: number[] }>;
  },
>(project: T, added: number): T {
  if (!project.phaseA || added < 1) return project;
  const clips = project.phaseA.clips;
  const firstNew = clips.length - added;
  const setId = clips[firstNew - 1]?.backgroundSetId;
  if (!setId) return project;
  const newNumbers = clips.slice(firstNew).map((clip) => clip.clipNumber);
  return {
    ...project,
    phaseA: {
      ...project.phaseA,
      clips: clips.map((clip, index) =>
        index >= firstNew ? { ...clip, backgroundSetId: setId } : clip,
      ),
    },
    backgroundPlates: project.backgroundPlates?.map((plate) =>
      plate.setId === setId
        ? {
            ...plate,
            clipNumbers: [...plate.clipNumbers, ...newNumbers.filter((n) => !plate.clipNumbers.includes(n))],
          }
        : plate,
    ),
  };
}

function sameNumbers(order: number[], current: number[]) {
  if (order.length !== current.length) return false;
  const left = [...order].sort((a, b) => a - b);
  const right = [...current].sort((a, b) => a - b);
  return left.every((value, index) => value === right[index]);
}

function renumber<T extends Numbered>(items: T[], map: Map<number, number>) {
  return items
    .map((item, index) => ({
      item: {
        ...item,
        clipNumber: map.get(item.clipNumber) ?? item.clipNumber,
      },
      index,
    }))
    .sort((a, b) => a.item.clipNumber - b.item.clipNumber || a.index - b.index)
    .map((entry) => entry.item);
}

function withTimeRanges(clips: StoryboardRow[]) {
  let cursor = 0;
  return clips.map((clip) => {
    const start = cursor;
    cursor += clip.durationSeconds;
    return { ...clip, timeRange: `${start}–${cursor}s` };
  });
}

function remapTimelineId(id: string, map: Map<number, number>) {
  const clipNumber = clipNumberFromTimelineId(id);
  if (clipNumber == null) return id;
  const next = map.get(clipNumber);
  return next == null ? id : clipTimelineId(next);
}

function remapTransitions<T>(transitions: Record<string, T>, map: Map<number, number>) {
  const next: Record<string, T> = {};
  for (const [key, value] of Object.entries(transitions)) {
    const [from, to] = key.split("__");
    if (!from || !to) {
      next[key] = value;
      continue;
    }
    next[`${remapTimelineId(from, map)}__${remapTimelineId(to, map)}`] = value;
  }
  return next;
}

function dropAndRenumber<T extends Numbered>(items: T[], removed: number, map: Map<number, number>) {
  return renumber(
    items.filter((item) => item.clipNumber !== removed),
    map,
  );
}

function transitionTouchesClip(id: string, removed: number) {
  return clipNumberFromTimelineId(id) === removed;
}

// Drop transitions that used the deleted clip, then renumber the rest.
function remapTransitionsAfterRemoval<T>(transitions: Record<string, T>, removed: number, map: Map<number, number>) {
  const next: Record<string, T> = {};
  for (const [key, value] of Object.entries(transitions)) {
    const [from, to] = key.split("__");
    if (!from || !to || transitionTouchesClip(from, removed) || transitionTouchesClip(to, removed)) continue;
    next[`${remapTimelineId(from, map)}__${remapTimelineId(to, map)}`] = value;
  }
  return next;
}

// Which clip stays open after `removed` is gone.
export function selectedClipAfterRemoval(selected: number, removed: number, remaining: number) {
  if (remaining < 1) return 1;
  if (selected === removed) return Math.min(removed, remaining);
  if (selected > removed) return selected - 1;
  return selected;
}

// Drop one storyboard clip and renumber everything that follows it.
export function removeClip<T extends ClipOrderProject>(
  project: T,
  clipNumber: number,
  options?: { language?: VoLanguage },
): { ok: true; project: T } | { ok: false; error: string } {
  const current = project.phaseA?.clips ?? [];
  if (!project.phaseA || !current.some((clip) => clip.clipNumber === clipNumber)) {
    return { ok: false, error: "找不到這段分鏡" };
  }
  if (current.length <= 1) return { ok: false, error: "至少保留一段" };
  const remaining = current
    .filter((clip) => clip.clipNumber !== clipNumber)
    .sort((a, b) => a.clipNumber - b.clipNumber);
  const map = new Map(remaining.map((clip, index) => [clip.clipNumber, index + 1]));
  const clips = withTimeRanges(remaining.map((clip, index) => ({ ...clip, clipNumber: index + 1 })));
  const total = clips.reduce((sum, clip) => sum + clip.durationSeconds, 0);
  const phaseA = {
    ...project.phaseA,
    clips,
    clipCount: clips.length,
    targetDuration: `${total}s`,
    englishWordCount: Math.max(
      1,
      clips.reduce((sum, clip) => sum + spokenUnits(clip.englishVo, options?.language), 0),
    ),
  };
  const cleared = {
    ...project,
    phaseA,
    clips: dropAndRenumber(project.clips, clipNumber, map),
    frames: project.frames ? dropAndRenumber(project.frames, clipNumber, map) : project.frames,
    subtitlePlates: project.subtitlePlates
      ? dropAndRenumber(project.subtitlePlates, clipNumber, map)
      : project.subtitlePlates,
    sceneChats: project.sceneChats
      ?.filter((thread) => thread.clipNumber !== clipNumber)
      .map((thread) => ({
        ...thread,
        clipNumber: map.get(thread.clipNumber) ?? thread.clipNumber,
        messages: thread.messages.map((message) => ({
          ...message,
          changedClips: message.changedClips
            ?.filter((change) => change.clipNumber !== clipNumber)
            .map((change) => ({
              ...change,
              clipNumber: map.get(change.clipNumber) ?? change.clipNumber,
            })),
        })),
      })),
    backgroundPlates: project.backgroundPlates?.map((plate) => ({
      ...plate,
      clipNumbers: plate.clipNumbers
        .filter((number) => number !== clipNumber)
        .map((number) => map.get(number) ?? number),
    })),
    phaseB: project.phaseB
      ? { ...project.phaseB, prompts: dropAndRenumber(project.phaseB.prompts, clipNumber, map) }
      : project.phaseB,
    autoVideoClips: project.autoVideoClips
      ?.filter((number) => number !== clipNumber)
      .map((number) => map.get(number) ?? number),
    edit: project.edit?.transitions
      ? { ...project.edit, transitions: remapTransitionsAfterRemoval(project.edit.transitions, clipNumber, map) }
      : project.edit,
  };
  // The old concat still contains this clip, so it is no longer the current reel.
  const withReel = cleared as T & {
    reelUrl?: string;
    reelStatus?: string;
    reelFingerprint?: string;
    reelError?: string;
    reelStep?: unknown;
    reelAttempts?: number;
  };
  withReel.reelUrl = undefined;
  withReel.reelStatus = undefined;
  withReel.reelFingerprint = undefined;
  withReel.reelError = undefined;
  withReel.reelStep = undefined;
  withReel.reelAttempts = undefined;
  return { ok: true, project: cleared };
}

// `order` is the old clip numbers in the new filmstrip order.
export function applyClipOrder<T extends ClipOrderProject>(
  project: T,
  order: number[],
): { ok: true; project: T } | { ok: false; error: string } {
  const current = project.phaseA?.clips.map((clip) => clip.clipNumber) ?? [];
  if (!project.phaseA || !sameNumbers(order, current)) {
    return { ok: false, error: "片段順序不完整" };
  }
  const map = new Map(order.map((oldNumber, index) => [oldNumber, index + 1]));
  const byNumber = new Map(project.phaseA.clips.map((clip) => [clip.clipNumber, clip]));
  const clips = withTimeRanges(
    order.map((oldNumber, index) => ({ ...byNumber.get(oldNumber)!, clipNumber: index + 1 })),
  );
  const phaseA = { ...project.phaseA, clips, clipCount: clips.length };
  return {
    ok: true,
    project: {
      ...project,
      phaseA,
      clips: renumber(project.clips, map),
      frames: project.frames ? renumber(project.frames, map) : project.frames,
      subtitlePlates: project.subtitlePlates
        ? renumber(project.subtitlePlates, map)
        : project.subtitlePlates,
      sceneChats: project.sceneChats?.map((thread) => ({
        ...thread,
        clipNumber: map.get(thread.clipNumber) ?? thread.clipNumber,
        messages: thread.messages.map((message) => ({
          ...message,
          changedClips: message.changedClips?.map((change) => ({
            ...change,
            clipNumber: map.get(change.clipNumber) ?? change.clipNumber,
          })),
        })),
      })),
      backgroundPlates: project.backgroundPlates?.map((plate) => ({
        ...plate,
        clipNumbers: plate.clipNumbers.map((clipNumber) => map.get(clipNumber) ?? clipNumber),
      })),
      phaseB: project.phaseB
        ? { ...project.phaseB, prompts: renumber(project.phaseB.prompts, map) }
        : project.phaseB,
      autoVideoClips: project.autoVideoClips?.map((clipNumber) => map.get(clipNumber) ?? clipNumber),
      edit: project.edit?.transitions
        ? { ...project.edit, transitions: remapTransitions(project.edit.transitions, map) }
        : project.edit,
    },
  };
}
