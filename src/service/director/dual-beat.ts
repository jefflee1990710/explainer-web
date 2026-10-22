import type { ClipStoryboardInput, StoryboardRow, VoLanguage } from "@/model/project";
import { getDirectorBySlug } from "@/service/director/catalog";
import { sceneStateLabels } from "@/service/director/languages";
import { subtitleLookLine, type SubtitleLook } from "@/service/director/subtitle-look";

// 白板概念解說 only: two stills + two spoken/subtitle beats per clip.
export const CARTOON_EXPLAINER_SKILL_SLUG = "cartoon-explainer-video-director";

export function isDualBeatSkill(skillSlug?: string) {
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.dualBeat;
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
    look?: SubtitleLook;
    lookLine?: string;
    hasCharacter?: boolean;
    // Cinematic realistic: both stills share one camera and one subtitle; only the action differs.
    steadyStills?: boolean;
  },
) {
  const labels = sceneStateLabels(options?.language);
  const steady = Boolean(options?.steadyStills);
  const sceneCompat =
    labels.start === "Start"
      ? 'explainerScene may repeat "Start: …. End: …" for compatibility. Write startScene and endScene in English.'
      : "explainerScene may repeat 起始：…。結尾：… for compatibility. Write startScene and endScene in the scene description language from the language setting.";
  // OFF 有兩種：完全無字（其他技能）或「只關字幕、保留場景短標籤」（白板概念解說）。
  const inWorldLabels = !sceneTextEnabled && Boolean(options?.inWorldLabels);
  const lookLine = options?.lookLine || subtitleLookLine(options?.look);
  return [
    "This skill uses Dual-Keyframe + Dual-Beat (白板概念解說 only).",
    "startScene: the t=0 still only — one frozen pose, props, environment. Not a motion paragraph. Exactly one figure per named character.",
    steady
      ? options?.hasCharacter
        ? "endScene: the t=N still only — startScene after this clip's one listed action has landed. The Camera line is a copy of the start Camera line: same shot size, same angle, same side, same crop. Body pose, hands, a vivid facial expression shift, and the moved element differ; nothing else does. The two stills are the before and after of that action, not two standing poses. An element the action moves stays visible in endScene, at its new place, with its destination still named. Still exactly one figure per named character. Write the landed picture, not the in-between path."
        : "endScene: the t=N still only — startScene after this clip's one change on the graph has landed. The Camera line is a copy of the start Camera line: same shot size, same angle, same crop. Same place and light. Still exactly one figure per named character. Never write a turning/walking action inside startScene or endScene."
      : options?.hasCharacter
        ? "endScene: the t=N still only — startScene after this clip's one listed action and its camera motion have landed, or, rarely, a full left-to-right or right-to-left cross. Body pose, a vivid facial expression shift, and head direction differ from startScene. The Camera line is the landed shot size and angle from that motion, not a copy of the start camera unless the motion keeps it locked. The two stills are the before and after of that action, not two standing poses. Screen side usually stays the same. An element the action moves stays visible in endScene, at its new place, with its destination still named. Still exactly one figure per named character. Write the landed picture, not the in-between path."
        : "endScene: the t=N still only — the landed resting pose of startScene after this clip's camera motion. Same place and light. The Camera line is where that motion stops, not a copy of the start camera unless the motion keeps it locked. Still exactly one figure per named character. Never write a turning/walking action ('從側身轉正面') inside startScene or endScene.",
    steady
      ? options?.hasCharacter
        ? "With a character: each clip is one action from the director's action list, chosen by what the line means, and not one used in either of the previous two clips. A different standing position is not a new action. Alternate the starting side between clips. The character stays on one side for the whole clip; no lateral cross. The camera is locked inside every clip: both Camera lines of a clip are the same. A new angle (from the side, from above, from the front, from behind) is chosen only between clips, at the cut. Clip 1's hook is one push-in or pull-out at most, played so it accelerates then decelerates, never a new angle. Add the drawn element that clip's action works on. A jump shows the feet leaving the ground. The travel, head turn, and drawings appearing live only in motionCamera."
        : "The camera is locked inside every clip: both Camera lines of a clip are the same. A new framing is chosen only between clips, at the cut. If the beat is a turn or step: startScene = the first resting pose, endScene = the landed resting pose. The travel itself lives only in motionCamera."
      : options?.hasCharacter
        ? "With a character: each clip is one action from the director's action list, chosen by what the line means, and not one used in either of the previous two clips. Do not repeat the previous clip's camera. A different standing position is not a new action. Alternate the starting side. About 80% of clips stay on that same side. Only about 20% cross left to right or right to left. Change the camera angle every clip: from the side, from above, from the front, or from behind as they turn around. Clip 1 always uses one exaggerated hook camera, and its start and end Camera lines use different shot sizes or angles. Add the drawn element that clip's action works on. A jump shows the feet leaving the ground. The travel, head turn, camera move, and drawings appearing live only in motionCamera."
        : "If the beat is a turn or step: startScene = the first resting pose, endScene = the landed resting pose. The travel itself lives only in motionCamera.",
    "motionCamera: the transition script between those two stills (see the motionCamera contract). Never a still prompt.",
    "startVo: first spoken sentence (0s → midpoint). endVo: second spoken sentence (midpoint → end).",
    `englishVo must be exactly startVo then endVo. ${sceneCompat}`,
    sceneTextEnabled || inWorldLabels
      ? `Voiceover captions OFF: no subtitle band and no Subtitle sentence on either still; never transcribe the voiceover on canvas. A short beat title, diagram labels, and short in-world labels (tags, arrow labels, box or bin names, cell numbers in 「」) ARE allowed and encouraged — they count toward the 3–4 visual devices per still. ${lookLine} Lettering follows that Look. Do not copy typography from the visual style.`
      : "On-canvas text OFF: no writing on either still.",
    "Do not take lettering from the visual style.",
    sceneTextEnabled || inWorldLabels
      ? "Labels must name a step, mechanism, or part of the diagram inside 「」; never transcribe the voiceover."
      : "Do not invent extra titles besides the beat voiceover.",
  ].join("\n");
}
