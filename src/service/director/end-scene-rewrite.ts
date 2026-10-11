import { generateText, Output } from "ai";
import { z } from "zod";
import type { StoryboardRow, VoLanguage } from "@/model/project";
import { isFollowShotSkill, isOutfitReelSkill, isSurpriseInterviewSkill } from "@/service/director/clip-continuity";
import { clearEndStillChoice } from "@/service/director/camera-move";
import { clipEndScene, clipStartScene, isDualBeatSkill, normalizeDualBeatRow } from "@/service/director/dual-beat";
import { sceneDescriptionLanguageLock } from "@/service/director/languages";
import { endSceneModel } from "@/service/director/model";
import { isTalkingHeadSkill } from "@/service/director/talking-head";

const endSceneRewriteSchema = z.object({
  clips: z.array(
    z.object({
      clipNumber: z.number().int().min(1),
      endScene: z.string(),
      endUsesStartStill: z.boolean(),
    }),
  ),
});

// These directors already set the end camera in code, or never ask a model for stills.
export function shouldRewriteEndScenes(skillSlug?: string) {
  if (!skillSlug) return true;
  return !isTalkingHeadSkill(skillSlug) && !isOutfitReelSkill(skillSlug) && !isSurpriseInterviewSkill(skillSlug);
}

export function endSceneRewriteSystem(language?: VoLanguage) {
  return [
    "You rewrite only the end still of each clip.",
    "endScene is one frozen picture of that clip's opening still after its camera motion has finished.",
    "Same place and light. The Camera line is the landed shot size, angle, and where subjects sit.",
    "If the motion keeps the camera locked, keep the opening framing.",
    "Keep the draft's subtitle sentence, logo, and 「」 labels that are still on screen when the motion ends. Do not change the spoken words.",
    "Write the landed picture, not the in-between path. Do not invent a new room or a new character.",
    "endUsesStartStill is a boolean, not a sentence. The image model copies an attached opening still.",
    "Set endUsesStartStill true only when the end keeps the opening camera angle and the subject's screen position: a locked camera, a push-in, or a zoom.",
    "Set endUsesStartStill false when the camera changes side or angle, or the subject lands in a different place on screen.",
    sceneDescriptionLanguageLock(language),
  ].join(" ");
}

export function endSceneRewritePrompt(clips: StoryboardRow[]) {
  return clips
    .map((clip) => {
      const spoken = clip.endVo?.trim() || clip.englishVo.trim();
      return [
        `Clip ${clip.clipNumber} (${clip.durationSeconds}s)`,
        `startScene:\n${clipStartScene(clip)}`,
        `motionCamera:\n${clip.motionCamera.trim()}`,
        `draft endScene:\n${clipEndScene(clip)}`,
        spoken ? `spoken line to keep if this still has a subtitle:\n${spoken}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function applyEndSceneRewrites(
  clips: StoryboardRow[],
  rewrites: Array<{ clipNumber: number; endScene: string; endUsesStartStill: boolean }>,
  options?: { dualBeat?: boolean },
) {
  const byNumber = new Map(
    rewrites
      .filter((item) => item.endScene.trim())
      .map((item) => [item.clipNumber, { endScene: item.endScene.trim(), endUsesStartStill: item.endUsesStartStill }]),
  );
  return clips.map((clip) => {
    const rewrite = byNumber.get(clip.clipNumber);
    if (!rewrite) return clip;
    const next = { ...clip, endScene: rewrite.endScene, endUsesStartStill: rewrite.endUsesStartStill };
    return options?.dualBeat ? normalizeDualBeatRow(next) : next;
  });
}

// Follow-shot opens on the previous end. A new end still has to become the next opening.
function chainCopiedStarts(clips: StoryboardRow[]) {
  return clips.map((clip, index) => {
    if (index === 0) return clip;
    const endScene = clips[index - 1]?.endScene?.trim();
    if (!endScene) return clip;
    // The next opening changed, so that clip's old yes/no no longer matches its start still.
    return clearEndStillChoice({ ...clip, startScene: endScene });
  });
}

type EndSceneGenerate = (input: {
  system: string;
  prompt: string;
}) => Promise<z.infer<typeof endSceneRewriteSchema> | undefined>;

async function generateEndScenes(input: { system: string; prompt: string }) {
  const { output } = await generateText({
    model: endSceneModel(),
    output: Output.object({ schema: endSceneRewriteSchema }),
    system: input.system,
    prompt: input.prompt,
  });
  return output ?? undefined;
}

// One Pro call for every end still. A failure keeps the Flash draft.
export async function rewriteEndScenes(
  input: { clips: StoryboardRow[]; language?: VoLanguage; skillSlug?: string },
  generate: EndSceneGenerate = generateEndScenes,
) {
  if (!shouldRewriteEndScenes(input.skillSlug) || input.clips.length === 0) return input.clips;
  try {
    const output = await generate({
      system: endSceneRewriteSystem(input.language),
      prompt: endSceneRewritePrompt(input.clips),
    });
    if (!output) return input.clips;
    const next = applyEndSceneRewrites(input.clips, output.clips, {
      dualBeat: isDualBeatSkill(input.skillSlug),
    });
    return isFollowShotSkill(input.skillSlug) ? chainCopiedStarts(next) : next;
  } catch (error) {
    console.error("end scene rewrite failed", error);
    return input.clips;
  }
}
