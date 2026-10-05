import type { ClipStoryboardInput, StoryboardRow, VoLanguage } from "@/model/project";
import { sceneStateLabels } from "@/service/director/languages";
import {
  resolveStyleLettering,
  type StyleLettering,
} from "@/service/style/lettering";

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
    /(?:起始|Start)[:：]\s*([\s\S]+?)\s*(?:結尾|\bEnd)(?:\s*[（(]\d+\s*(?:秒後|s later)[）)])?\s*[:：]\s*([\s\S]+)$/i,
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

export function joinSceneBeats(startScene: string, endScene: string, language?: VoLanguage) {
  const labels = sceneStateLabels(language ?? sceneLabelLanguage(startScene, endScene));
  const start = startScene.trim();
  const end = endScene.trim();
  if (labels.start === "Start") return `Start: ${start}. End: ${end}`;
  return `起始：${start}。結尾：${end}`;
}

// Combined explainerScene keeps the labels of whichever language the stills use.
function sceneLabelLanguage(startScene: string, endScene: string): VoLanguage {
  return /[\u4e00-\u9fff]/.test(`${startScene}${endScene}`) ? "zh" : "en";
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
  options?: {
    inWorldLabels?: boolean;
    language?: VoLanguage;
    lettering?: StyleLettering;
    hasCharacter?: boolean;
  },
) {
  const lettering = resolveStyleLettering(options?.lettering);
  const labels = sceneStateLabels(options?.language);
  const sceneCompat =
    labels.start === "Start"
      ? 'explainerScene may repeat "Start: …. End: …" for compatibility. Write startScene and endScene in English.'
      : "explainerScene may repeat 起始：…。結尾：… for compatibility. Write startScene and endScene in the scene description language from the language setting.";
  // OFF 有兩種：完全無字（其他技能）或「只關字幕、保留場景短標籤」（白板概念解說）。
  const inWorldLabels = !sceneTextEnabled && Boolean(options?.inWorldLabels);
  const look = [lettering.letteringLine1, lettering.letteringLine2].filter(Boolean).join(" ");
  return [
    "This skill uses Dual-Keyframe + Dual-Beat (白板概念解說 only).",
    "startScene: the t=0 still only — one frozen pose, props, environment. Not a motion paragraph. Exactly one figure per named character.",
    options?.hasCharacter
      ? "endScene: the t=N still only — the later pose after this clip's one action (a push, a pull, a jump, or a point toward the camera) or, rarely, a full left-to-right or right-to-left cross. Body pose, facial expression, and head direction differ from startScene. The two stills are the before and after of that action, not two standing poses. Screen side usually stays the same. Still exactly one figure per named character. Never write the pushing, pulling, jumping, or camera move inside startScene or endScene."
      : "endScene: the t=N still only — the later frozen pose on the same locked camera, not a near-copy of startScene. Still exactly one figure per named character. Never write a turning/walking action ('從側身轉正面') inside startScene or endScene.",
    options?.hasCharacter
      ? "With a character: do not repeat the previous clip's action or camera. Each clip is one of push, pull, jump, or point toward the camera, and the next clip uses a different one. A different standing position is not a new action. Alternate the starting side. About 80% of clips stay on that same side. Only about 20% cross left to right or right to left. Change the camera angle every clip: from the side, from above, from the front, or from behind as they turn around. Add the drawn element that clip pushes, pulls, or points past. A jump shows the feet leaving the ground. The travel, head turn, camera move, and drawings appearing live only in motionCamera."
      : "If the beat is a turn or step: startScene = the first resting pose, endScene = the landed resting pose. The travel itself lives only in motionCamera.",
    "motionCamera: the transition script between those two stills (see the motionCamera contract). Never a still prompt.",
    "startVo: first spoken sentence (0s → midpoint). endVo: second spoken sentence (midpoint → end).",
    `englishVo must be exactly startVo then endVo. ${sceneCompat}`,
    sceneTextEnabled
      ? `On-canvas text ON: start still quotes ONLY startVo; end still quotes ONLY endVo as handwritten marker lettering.${lettering.letteringLayout ? ` ${lettering.letteringLayout}` : ""} Not a bottom subtitle bar. English is all-caps.${look ? ` ${look}` : ""} Two beats switch at the midpoint. Never both voiceover lines on one still. motionCamera includes a midpoint beat where the startVo lettering wipes off and the endVo lettering writes on in the same spot. Never copy the voiceover lettering into startScene or endScene; the still prompt adds it from startVo / endVo.`
      : inWorldLabels
        ? "Voiceover captions OFF: no subtitle band on either still. A short beat title, diagram labels, and in-world handwritten labels (yellow tags, arrow labels, box or bin names, cell numbers in 「」) ARE allowed and encouraged — they count toward the 3–4 visual devices per still."
        : "On-canvas text OFF: no writing on either still.",
    sceneTextEnabled
      ? "Lettering follows the selected visual style catalog — never a printed caption or a bottom white band."
      : "Lettering look follows the selected visual style catalog — do not force whiteboard marker lettering unless that style asks for it.",
    sceneTextEnabled
      ? `Also write one short beat title that names this clip's idea.${lettering.beatTitleLayout ? ` ${lettering.beatTitleLayout}` : ""} Also add diagram labels / node names / arrow names inside 「」 on the graph they belong to. Do not dump the full voiceover into startScene or endScene.`
      : inWorldLabels
        ? "Labels must name a step, mechanism, or part of the diagram; never transcribe the voiceover."
        : "Do not invent extra titles besides the beat voiceover.",
  ].join("\n");
}
