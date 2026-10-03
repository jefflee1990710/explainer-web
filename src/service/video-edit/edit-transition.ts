import { EDIT_LIMITS, emptyEdit, type EditTransition, type ReusableEdit, type VideoEdit } from "@/model/video-edit";
import { clipTimelineId, type EditTimelineItem } from "@/service/video-edit/edit-timeline";

export type TimelineGap = {
  key: string;
  fromId: string;
  toId: string;
};

export function transitionKey(fromId: string, toId: string) {
  return `${fromId}__${toId}`;
}

export function defaultTransition(): EditTransition {
  return { effect: "none", durationSec: EDIT_LIMITS.transitionDurationSec.default };
}

export function clampTransition(input: EditTransition): EditTransition {
  const { min, max } = EDIT_LIMITS.transitionDurationSec;
  return {
    effect: input.effect,
    durationSec: Math.min(max, Math.max(min, Math.round(input.durationSec * 10) / 10)),
  };
}

export function timelineGaps(items: EditTimelineItem[]): TimelineGap[] {
  const gaps: TimelineGap[] = [];
  for (let i = 0; i < items.length - 1; i += 1) {
    const fromId = items[i].id;
    const toId = items[i + 1].id;
    gaps.push({ key: transitionKey(fromId, toId), fromId, toId });
  }
  return gaps;
}

export function resolveTransition(edit: VideoEdit, fromId: string, toId: string): EditTransition {
  const saved = edit.transitions?.[transitionKey(fromId, toId)];
  if (saved) return saved;
  return edit.defaultTransition ?? defaultTransition();
}

export function setTransition(
  edit: VideoEdit,
  fromId: string,
  toId: string,
  transition: EditTransition,
): VideoEdit {
  const next = clampTransition(transition);
  return {
    ...edit,
    defaultTransition: next,
    transitions: { ...edit.transitions, [transitionKey(fromId, toId)]: next },
  };
}

export type { ReusableEdit };

// Folder-level copy: intro, outro, and transitions follow the user to the next video.
export function pickReusableEdit(edit: VideoEdit): ReusableEdit {
  return {
    ...(edit.intro ? { intro: { ...edit.intro } } : {}),
    ...(edit.outro ? { outro: { ...edit.outro } } : {}),
    ...(edit.defaultTransition ? { defaultTransition: { ...edit.defaultTransition } } : {}),
    ...(edit.transitions ? { transitions: { ...edit.transitions } } : {}),
  };
}

export function applyReusableEdit(defaults?: ReusableEdit): VideoEdit {
  if (!defaults) return emptyEdit();
  return { layers: [], ...pickReusableEdit(defaults as VideoEdit) };
}

export function hasReusableEdit(defaults?: ReusableEdit) {
  return Boolean(
    defaults && (defaults.intro || defaults.outro || defaults.defaultTransition || defaults.transitions),
  );
}

export function clipPairTransitions(edit: VideoEdit, clipNumbers: number[]) {
  const sorted = [...clipNumbers].sort((a, b) => a - b);
  const pairs: EditTransition[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    pairs.push(resolveTransition(edit, clipTimelineId(sorted[i]), clipTimelineId(sorted[i + 1])));
  }
  return pairs;
}
