import { generateText, Output } from "ai";
import { dualBeatStoryboardRowSchema, storyboardRowSchema } from "@/model/director";
import type { PhaseAProposal, ReferenceImage, StoryboardRow, VoLanguage } from "@/model/project";
import { chainsClipStarts } from "@/service/director/clip-continuity";
import { clearEndStillChoice } from "@/service/director/camera-move";
import { isDualBeatSkill, normalizeDualBeatRow } from "@/service/director/dual-beat";
import { rewriteEndScenes } from "@/service/director/end-scene-rewrite";
import { usesSteadyStills } from "@/service/director/steady-stills";
import { LANGUAGE_PRESETS, sceneDescriptionLanguageLock } from "@/service/director/languages";
import { skillPromptForPhaseA } from "@/service/director/load-skill-prompt";
import { directorModel } from "@/service/director/model";
import { resolvePerformance } from "@/service/director/performance";
import { isTalkingHeadSkill, planTalkingHeadClips, talkingHeadShot } from "@/service/director/talking-head";
import { talkingShotForSkill } from "@/service/director/talking-performance";
import { sanitizeClipReferenceIds } from "@/service/project/reference-images";
import type { Skill } from "@/model/skill";
import type { RenderableStyle } from "@/service/style/renderable-style";
import type { Style } from "@/service/style";
import type { AspectRatio, SpeechPace } from "@/model/project";
import type { CastMember } from "@/model/character";

const clipDraftSchema = storyboardRowSchema.omit({ clipNumber: true, timeRange: true });
const dualClipDraftSchema = dualBeatStoryboardRowSchema.omit({ clipNumber: true, timeRange: true });

export const APPEND_CLIP_MAX = 20;

function clipBrief(clip: StoryboardRow) {
  return [
    `Clip ${clip.clipNumber} (${clip.durationSeconds}s) ${clip.narrativeJob}`,
    clip.startScene ? `start: ${clip.startScene}` : `scene: ${clip.explainerScene}`,
    clip.endScene ? `end: ${clip.endScene}` : "",
    `motion: ${clip.motionCamera}`,
    `spoken: ${clip.englishVo}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// One new clip, continuing the storyboard the director already wrote.
function clipBefore(phaseA: PhaseAProposal, insertAt: number) {
  return phaseA.clips.find((clip) => clip.clipNumber === insertAt - 1);
}

function clipAfter(phaseA: PhaseAProposal, insertAt: number) {
  return phaseA.clips.find((clip) => clip.clipNumber === insertAt);
}

// Where the new clip sits. `insertAt` 1 is before the current first clip.
export function appendClipPlacement(phaseA: PhaseAProposal, insertAt: number) {
  const before = clipBefore(phaseA, insertAt);
  const after = clipAfter(phaseA, insertAt);
  if (before && after) {
    return `You are adding one clip between clip ${before.clipNumber} and clip ${after.clipNumber}. Return that one clip only.`;
  }
  if (after) return "You are adding one clip before the current first clip. Return that one clip only.";
  return "You are adding one clip to the end of a finished storyboard. Return that one clip only.";
}

export function appendClipUserPrompt(phaseA: PhaseAProposal, content: string, insertAt?: number) {
  const at = insertAt ?? phaseA.clips.length + 1;
  const before = clipBefore(phaseA, at);
  const after = clipAfter(phaseA, at);
  const others = phaseA.clips
    .filter((clip) => clip !== before && clip !== after)
    .map((clip) => `Clip ${clip.clipNumber}: ${clip.narrativeJob} — ${clip.englishVo}`)
    .join("\n");
  const slot = before && after
    ? `Write ONE new clip that plays after clip ${before.clipNumber} and before clip ${after.clipNumber}.`
    : after
      ? `Write ONE new clip that plays before clip ${after.clipNumber}.`
      : `Write ONE new clip that plays after clip ${before?.clipNumber ?? 0}.`;
  return [
    `Visual world: ${phaseA.visualWorld}`,
    `Core message: ${phaseA.coreMessage}`,
    others ? `Other clips:\n${others}` : "",
    before ? `Clip it follows:\n${clipBrief(before)}` : "",
    after ? `Clip that follows it:\n${clipBrief(after)}` : "",
    slot,
    "Do not repeat an earlier clip. Continue the same cast, place, and voice.",
    `Content for the new clip:\n${content}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function inheritOpening(row: StoryboardRow, previous: StoryboardRow | undefined, skillSlug: string) {
  if (!chainsClipStarts(skillSlug)) return row;
  const endScene = previous?.endScene?.trim();
  if (!endScene) return row;
  return clearEndStillChoice({ ...row, startScene: endScene });
}

type AppendInput = {
  skill: Skill;
  style: Style | RenderableStyle;
  language?: VoLanguage;
  speechPace?: SpeechPace;
  aspectRatio: AspectRatio;
  source: string;
  spokenScript?: string;
  phaseA: PhaseAProposal;
  referenceImages?: ReferenceImage[];
  backgroundImageUrls?: string[];
  cast?: CastMember[];
  content: string;
  // 1-based slot. Omit to add after the last clip.
  insertAt?: number;
};

// Director flow for one extra clip: storyboard row, then the end-still rewrite.
export async function draftAppendedClips(input: AppendInput): Promise<StoryboardRow[]> {
  const skillSlug = input.skill.slug;
  const insertAt = input.insertAt ?? input.phaseA.clips.length + 1;
  const previous = input.phaseA.clips.find((clip) => clip.clipNumber === insertAt - 1);
  if (isTalkingHeadSkill(skillSlug)) {
    const planned = planTalkingHeadClips({
      source: input.content,
      pace: input.speechPace,
      language: input.language,
      aspectRatio: input.aspectRatio,
      shot: talkingHeadShot(input.skill.customProfile?.visual || input.skill.profile?.visual),
      background: Boolean(input.backgroundImageUrls?.length),
      performance: resolvePerformance(
        input.skill,
        talkingShotForSkill(input.skill.slug) ?? "face",
        input.language,
      ),
    });
    return planned.map((row) => inheritOpening(row, previous, skillSlug));
  }

  const language = LANGUAGE_PRESETS[input.language || "en"];
  const dualBeat = isDualBeatSkill(skillSlug);
  // Cinematic realistic whiteboard: same camera and one subtitle on both stills.
  const steadyStills = usesSteadyStills(skillSlug, input.style);
  const generated = await generateText({
    model: directorModel(),
    output: Output.object({ schema: dualBeat ? dualClipDraftSchema : clipDraftSchema }),
    system: `${skillPromptForPhaseA(input.skill, input.style)}

${appendClipPlacement(input.phaseA, insertAt)}
${language.planningSkillHint}
${sceneDescriptionLanguageLock(input.language)}
durationSeconds is ${dualBeat ? "5 to 8" : "3 to 8"}.
The englishVo field is the spoken line in ${language.label}. Leave referenceTranslation empty.
${dualBeat ? "Write startScene, endScene, startVo, and endVo. motionCamera is the move between the two stills." : "motionCamera is the camera move through this clip."}
${steadyStills ? "Both stills share the same Camera line and the same whole subtitle (startVo then endVo). Only the one action differs between them. motionCamera starts, accelerates through the one action, then decelerates into the landing. No wipe or rewrite of the lettering." : ""}
The next clip's start inherits the previous clip's end environment.`,
    prompt: `Director instruction:\n${input.source}\n\n${appendClipUserPrompt(input.phaseA, input.content, insertAt)}`,
  });
  if (!generated.output) {
    if (generated.finishReason === "content-filter") {
      throw new Error("這次題材被模型拒絕，請改寫內容後再試。");
    }
    throw new Error("新增片段失敗");
  }
  const drafted = generated.output;
  if (!drafted.explainerScene.trim() && !drafted.startScene?.trim()) {
    throw new Error("導演沒有寫出畫面");
  }
  const [sanitized] = sanitizeClipReferenceIds([drafted], input.referenceImages);
  const row = inheritOpening(
    dualBeat ? normalizeDualBeatRow({ ...sanitized, clipNumber: 0, timeRange: "" }) : { ...sanitized, clipNumber: 0, timeRange: "" },
    previous,
    skillSlug,
  );
  const [rewritten] = await rewriteEndScenes({
    clips: [row],
    language: input.language,
    skillSlug,
    lockedCamera: steadyStills,
  });
  return [rewritten ?? row];
}
