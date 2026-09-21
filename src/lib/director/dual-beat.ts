import type { ClipStoryboardInput, StoryboardRow } from "@/types/project";

// 白板概念解說 only: two stills + two spoken/subtitle beats per clip.
export const CARTOON_EXPLAINER_SKILL_SLUG = "cartoon-explainer-video-director";

export function isDualBeatSkill(skillSlug?: string) {
  return skillSlug === CARTOON_EXPLAINER_SKILL_SLUG;
}

export function splitVoBeats(englishVo: string) {
  const text = englishVo.trim();
  if (!text) return { start: "", end: "" };
  const match = text.match(/^([\s\S]+?[.!?。！？])\s*([\s\S]+)$/);
  if (match) return { start: match[1].trim(), end: match[2].trim() };
  return { start: text, end: text };
}

export function splitSceneBeats(explainerScene: string) {
  const text = explainerScene.trim();
  if (!text) return { start: "", end: "" };
  const labeled = text.match(
    /起始[:：]\s*([\s\S]+?)\s*結尾(?:[（(]\d+秒後[）)])?[:：]\s*([\s\S]+)$/,
  );
  if (labeled) {
    return {
      start: labeled[1].replace(/[。.\s]+$/u, "").trim(),
      end: labeled[2].trim(),
    };
  }
  return { start: text, end: text };
}

export function joinVoBeats(startVo: string, endVo: string) {
  return [startVo.trim(), endVo.trim()].filter(Boolean).join(" ");
}

export function joinSceneBeats(startScene: string, endScene: string) {
  return `起始：${startScene.trim()}。結尾：${endScene.trim()}`;
}

export function clipStartScene(row: Pick<StoryboardRow, "explainerScene" | "startScene">) {
  return row.startScene?.trim() || splitSceneBeats(row.explainerScene).start;
}

export function clipEndScene(row: Pick<StoryboardRow, "explainerScene" | "endScene">) {
  return row.endScene?.trim() || splitSceneBeats(row.explainerScene).end;
}

export function clipStartVo(row: Pick<StoryboardRow, "englishVo" | "startVo">) {
  return row.startVo?.trim() || splitVoBeats(row.englishVo).start;
}

export function clipEndVo(row: Pick<StoryboardRow, "englishVo" | "endVo">) {
  return row.endVo?.trim() || splitVoBeats(row.englishVo).end;
}

export function hasDualBeatDraft(input: {
  startScene?: string;
  endScene?: string;
  startVo?: string;
  endVo?: string;
}) {
  return Boolean(
    input.startScene?.trim() ||
      input.endScene?.trim() ||
      input.startVo?.trim() ||
      input.endVo?.trim(),
  );
}

// Keep combined fields in sync so legacy readers still work.
export function syncDualBeatFields(input: ClipStoryboardInput): ClipStoryboardInput {
  if (!hasDualBeatDraft(input)) {
    return {
      explainerScene: input.explainerScene,
      motionCamera: input.motionCamera,
      englishVo: input.englishVo,
    };
  }
  const startScene = input.startScene?.trim() || splitSceneBeats(input.explainerScene).start;
  const endScene = input.endScene?.trim() || splitSceneBeats(input.explainerScene).end;
  const startVo = input.startVo?.trim() || splitVoBeats(input.englishVo).start;
  const endVo = input.endVo?.trim() || splitVoBeats(input.englishVo).end;
  return {
    startScene,
    endScene,
    startVo,
    endVo,
    motionCamera: input.motionCamera,
    explainerScene: joinSceneBeats(startScene, endScene),
    englishVo: joinVoBeats(startVo, endVo),
  };
}

export function normalizeDualBeatRow(row: StoryboardRow): StoryboardRow {
  const startScene = clipStartScene(row);
  const endScene = clipEndScene(row);
  const startVo = clipStartVo(row);
  const endVo = clipEndVo(row);
  return {
    ...row,
    startScene,
    endScene,
    startVo,
    endVo,
    explainerScene: joinSceneBeats(startScene, endScene),
    englishVo: joinVoBeats(startVo, endVo),
  };
}

export function dualBeatDirectorBlock(sceneTextEnabled: boolean) {
  return [
    "This skill uses Dual-Keyframe + Dual-Beat (白板概念解說 only).",
    "startScene: the t=0 still only — pose, props, environment. Not a motion paragraph.",
    "endScene: the t=N still only — same locked camera, later beat, not a near-copy of startScene.",
    "motionCamera: interpolation path and travel distance between those two stills. Never a still prompt.",
    "startVo: first spoken sentence (0s → midpoint). endVo: second spoken sentence (midpoint → end).",
    "englishVo must be exactly startVo then endVo. explainerScene may repeat 起始：…。結尾：… for compatibility.",
    sceneTextEnabled
      ? "On-canvas text ON: start still quotes ONLY startVo; end still quotes ONLY endVo. Two subtitle beats switch at the midpoint. Never both lines on one still."
      : "On-canvas text OFF: no writing on either still.",
    "Lettering look follows the selected visual style catalog — do not force whiteboard marker lettering unless that style asks for it.",
    "Do not invent extra titles besides the beat voiceover.",
  ].join("\n");
}
