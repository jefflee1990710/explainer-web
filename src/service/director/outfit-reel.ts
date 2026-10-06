import type { FramePosition, PhaseAProposal, StoryboardRow } from "@/model/project";

// Modest sportswear start. "Tight shorts" and hand-held garments trip image safety.
export const OUTFIT_BASE_LOOK =
  "an opaque white crew-neck tank that covers the shoulders and torso, plus white knee-length athletic shorts";

export const OUTFIT_CLIP1_START_LOCK =
  "Only the Scene garments are on: an opaque white crew-neck tank covering the shoulders and torso, plus white knee-length athletic shorts, hands at the sides. Do not draw a skirt, socks, shoes, bag, dress, or extra layers.";

export const OUTFIT_CLIP1_START_MOTION = "0–1s she stands still with both hands relaxed at the sides";

export function outfitClip1StartCharacter(name: string) {
  return `Character: ${name} stands centered facing forward, wearing ${OUTFIT_BASE_LOOK}, both hands relaxed at the sides.`;
}

function castNameFromPhaseA(phaseA: Pick<PhaseAProposal, "characterLock" | "clips">) {
  const fromScene = phaseA.clips[0]?.startScene?.match(/Character:\s*([^,]+?)\s+stands/i);
  if (fromScene?.[1]) return fromScene[1].trim();
  const fromLock = phaseA.characterLock.split(/[：:]/)[0]?.trim();
  return fromLock || "the character";
}

function rewriteRiskyWardrobe(text: string) {
  return text
    .replace(/plain white tight shorts only/gi, OUTFIT_BASE_LOOK)
    .replace(/white tight shorts/gi, "white knee-length athletic shorts")
    .replace(/tight shorts/gi, "knee-length athletic shorts")
    .replace(/mini skirt/gi, "pleated skirt")
    .replace(/at thigh height/gi, "at the waist")
    .replace(/at chest level/gi, "at the waist")
    .replace(/bare torso/gi, "covered torso")
    .replace(/pelvic area/gi, "waist");
}

export function rewriteOutfitSafetyText(text: string) {
  return rewriteRiskyWardrobe(text);
}

function spliceCharacterBlock(scene: string, characterLine: string) {
  if (/Character:/i.test(scene)) {
    return scene.replace(/Character:[\s\S]*?(?=Set:|Light:|Camera:|$)/i, `${characterLine} `).trim();
  }
  return `${characterLine} ${scene}`.trim();
}

function sanitizeClip(clip: StoryboardRow, name: string): StoryboardRow {
  let startScene = rewriteRiskyWardrobe(clip.startScene || "");
  let endScene = rewriteRiskyWardrobe(clip.endScene || "");
  let explainerScene = rewriteRiskyWardrobe(clip.explainerScene);
  let motionCamera = rewriteRiskyWardrobe(clip.motionCamera);
  if (clip.clipNumber === 1) {
    startScene = spliceCharacterBlock(startScene, outfitClip1StartCharacter(name));
    const startLine = `Start: ${name} stands centered facing the camera, wearing ${OUTFIT_BASE_LOOK}, hands relaxed at the sides.`;
    explainerScene = /Start:/i.test(explainerScene)
      ? explainerScene.replace(/Start:[\s\S]*?(?=End:|$)/i, `${startLine} `).trim()
      : `${startLine} ${explainerScene}`.trim();
    motionCamera = motionCamera.replace(/^[^;；]+/, OUTFIT_CLIP1_START_MOTION);
  }
  return {
    ...clip,
    startScene,
    endScene,
    explainerScene,
    motionCamera,
  };
}

// Clip 1 start is a standing athletic base. Later rows lose safety-trigger wording.
export function sanitizeOutfitFrameScene(input: {
  scene: string;
  clipNumber: number;
  position: FramePosition;
  name?: string;
}) {
  let scene = rewriteRiskyWardrobe(input.scene);
  if (input.clipNumber === 1 && input.position === "start") {
    scene = spliceCharacterBlock(
      scene,
      outfitClip1StartCharacter(input.name?.trim() || "the character"),
    );
  }
  return scene;
}

export function sanitizeOutfitPhaseA(phaseA: PhaseAProposal): PhaseAProposal {
  const name = castNameFromPhaseA(phaseA);
  return {
    ...phaseA,
    clips: phaseA.clips.map((clip) => sanitizeClip(clip, name)),
  };
}
