import type { ClipStoryboardInput, StoryboardRow } from "@/model/project";

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

export function dualBeatDirectorBlock(
  sceneTextEnabled: boolean,
  options?: { inWorldLabels?: boolean },
) {
  // OFF 有兩種：完全無字（其他技能）或「只關字幕、保留場景短標籤」（白板概念解說）。
  const inWorldLabels = !sceneTextEnabled && Boolean(options?.inWorldLabels);
  return [
    "This skill uses Dual-Keyframe + Dual-Beat (白板概念解說 only).",
    "startScene: the t=0 still only — one frozen pose, props, environment. Not a motion paragraph. Exactly one figure per named character.",
    "endScene: the t=N still only — the later frozen pose on the same locked camera, not a near-copy of startScene. Still exactly one figure per named character. Never write a turning/walking action ('從側身轉正面') inside startScene or endScene.",
    "If the beat is a turn or step: startScene = the first resting pose, endScene = the landed resting pose. The travel itself lives only in motionCamera.",
    "motionCamera: interpolation path and travel distance between those two stills. Never a still prompt.",
    "startVo: first spoken sentence (0s → midpoint). endVo: second spoken sentence (midpoint → end).",
    "englishVo must be exactly startVo then endVo. explainerScene may repeat 起始：…。結尾：… for compatibility.",
    sceneTextEnabled
      ? "On-canvas text ON: start still quotes ONLY startVo; end still quotes ONLY endVo as handwritten marker lettering centered at 52%–60% of the frame height, max 2 lines, generous side margins. Not a bottom subtitle bar. English is all-caps black marker; the second line sits in a warm-yellow highlight box. Two beats switch at the midpoint. Never both voiceover lines on one still."
      : inWorldLabels
        ? "Voiceover captions OFF: no subtitle band or title card on either still. Short in-world handwritten labels (yellow tags, arrow labels, box or bin names, 1–3 all-caps words in 「」) ARE allowed and encouraged — they count toward the 3–4 visual devices per still."
        : "On-canvas text OFF: no writing on either still.",
    sceneTextEnabled
      ? "Lettering follows the whiteboard doodle visual style catalog: handwritten marker, never a printed caption or a bottom white band."
      : "Lettering look follows the selected visual style catalog — do not force whiteboard marker lettering unless that style asks for it.",
    sceneTextEnabled
      ? "Short prop labels in 「」 may sit on the object they name. Do not invent a title card besides the beat voiceover."
      : inWorldLabels
        ? "Labels must name a prop or concept in the scene; never transcribe the voiceover or add a headline."
        : "Do not invent extra titles besides the beat voiceover.",
  ].join("\n");
}
