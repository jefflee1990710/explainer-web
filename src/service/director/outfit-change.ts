import type { FramePosition, PhaseAProposal, StoryboardRow } from "@/model/project";
import { rewriteOutfitSafetyText } from "@/service/director/outfit-reel";

// Same empty room, locked camera. Only the complete look changes at the cut.
export const OUTFIT_CHANGE_COVERED_SWAP =
  "This clip's look stays exactly as in the first frame. Do not put clothes on or take them off. Do not change style or colour during the clip. The next clip is a hard cut to a different complete look.";

export const OUTFIT_CHANGE_LOOK_LOCK =
  "wearing the complete look assigned to THIS clip from its clothing reference, copied exactly for style, cut, colour, pattern, and details. Do not redesign, recolor, drop, or add any piece. Do not keep the previous clip's clothes. Only the clothes change. The person is the character blueprint, not the model in the clothing photo.";

export const OUTFIT_CHANGE_ENERGY =
  "She is calm and editorial: a soft closed-mouth expression, relaxed eyes to camera, quiet shoulders, feet planted. Not a bright grin, not a blank stare, and not a bounce.";

export const OUTFIT_CHANGE_VIDEO_MOTION_RULES = [
  "She is already wearing THIS clip's complete look in the first frame. The last frame is the same look, same pose, same room, and the same locked camera.",
  "Do not put clothes on, take clothes off, or change a garment during the clip. The next clip is a hard cut to a different complete look.",
  "The camera stays locked: same height, same distance, same crop, same subject size. No gimbal rotation, no push, no zoom, no handheld shake, no whip, no snap, and no jump inside the clip.",
  "She stays planted with a calm editorial expression. One small breath or weight shift only. She does not walk, spin, bounce, or dress.",
  "The person stays the character from the blueprint. Only the clothes come from this clip's clothing reference.",
  "No spoken words, no voiceover, no narrator, and no lip-sync. englishVo is (no dialogue).",
  "No background music, no score, no underscore. One sound effect only, matching this clip's bgmSfx.",
].join(" ");

export const OUTFIT_CHANGE_CAMERA =
  "locked eye-level three-quarter, waist-up to mid-thigh, centered, same crop, same subject size, no tilt, no push, no zoom";

export const OUTFIT_CHANGE_SFX = ["one soft whoosh", "one soft cloth snap"] as const;

export type OutfitChangeLook = {
  label: string;
  referenceImageIds: string[];
  variant?: "buttoned" | "unbuttoned";
};

const PLANTED_POSE =
  "stands calm and editorial, relaxed shoulders, both hands loosely at her sides, feet planted in the same spot, soft closed-mouth expression, eyes to camera";

const OUTFIT_CHANGE_ROOM =
  "one empty cream-white room: plain wall, no furniture, no window, no shelf, no plant. Soft even indoor daylight. Do not change this room.";

const OUTFIT_CHANGE_LIGHT =
  "soft even indoor daylight, low contrast, no hard window slash, no beauty dish, no rim from behind";

function lookLockLine(look: OutfitChangeLook) {
  if (look.variant) {
    return `${OUTFIT_CHANGE_LOOK_LOCK} Styling variant only: the same garment, ${look.variant}. Same cut, colour, and details; only the front buttons change.`;
  }
  return OUTFIT_CHANGE_LOOK_LOCK;
}

function allReferenceIds(clips: StoryboardRow[]) {
  const ids: string[] = [];
  for (const clip of clips) {
    for (const id of clip.referenceImageIds || []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

// One complete look per clip. Extra clips cycle the photos, or alternate buttoned / unbuttoned.
export function assignOutfitChangeLooks(
  count: number,
  referenceIds: string[],
  source = "",
): OutfitChangeLook[] {
  const wantsStyling = /buttoned|unbuttoned|扣上|不扣/i.test(source);
  const looks: OutfitChangeLook[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = referenceIds[index % Math.max(referenceIds.length, 1)] || "";
    const n = index + 1;
    let variant: OutfitChangeLook["variant"];
    if (wantsStyling && referenceIds.length <= 1) {
      variant = index % 2 === 0 ? "buttoned" : "unbuttoned";
    } else if (wantsStyling && referenceIds.length > 0 && index >= referenceIds.length) {
      variant = Math.floor(index / referenceIds.length) % 2 === 1 ? "unbuttoned" : "buttoned";
    }
    const variantLabel = variant ? ` (${variant})` : "";
    looks.push({
      label: id ? `Look ${n}${variantLabel}` : `Look ${n}`,
      referenceImageIds: id ? [id] : [],
      variant,
    });
  }
  return looks;
}

export function outfitChangeCameraLine(scene: string) {
  return scene.match(/Camera:\s*(.+)$/i)?.[1]?.replace(/\.\s*$/, "").trim() || "";
}

// Locked camera reminder so the still cannot invent a new angle.
export function outfitChangeCameraDirective(clipNumber: number, position: FramePosition, scene: string) {
  const camera = outfitChangeCameraLine(scene) || OUTFIT_CHANGE_CAMERA;
  const hardCut = clipNumber > 1 && position === "start" ? "NEW LOOK. Hard cut. Same locked camera. " : "";
  if (position === "end") {
    return `${hardCut}END FRAME CAMERA: ${camera}. Same locked camera, same pose, same room, same crop. Only this clip's look is on.`;
  }
  return `${hardCut}START FRAME CAMERA: ${camera}.`;
}

function castNameFromPhaseA(phaseA: Pick<PhaseAProposal, "characterLock" | "clips">) {
  const fromScene = phaseA.clips[0]?.startScene?.match(/Character:\s*([^,]+?)(?:\s+stands|\s+wears|,)/i);
  if (fromScene?.[1]) return fromScene[1].trim();
  const fromLock = phaseA.characterLock.split(/[：:]/)[0]?.trim();
  return fromLock || "the character";
}

function characterLine(name: string, look: OutfitChangeLook) {
  return `Character: ${name} ${PLANTED_POSE}, ${lookLockLine(look)}`;
}

function spliceCharacterBlock(scene: string, line: string) {
  if (/Character:/i.test(scene)) {
    return scene.replace(/Character:[\s\S]*?(?=Set:|Light:|Camera:|$)/i, `${line} `).trim();
  }
  return `${line} ${scene}`.trim();
}

function spliceCamera(scene: string, camera: string) {
  if (/Camera:/i.test(scene)) {
    return scene.replace(/Camera:[\s\S]*$/i, `Camera: ${camera}.`).trim();
  }
  return `${scene} Camera: ${camera}.`.trim();
}

function scenePart(scene: string, label: "Set" | "Light") {
  return scene.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\s+(?:Set|Light|Camera):|$)`, "i"))?.[1]?.trim() || "";
}

function splicePart(scene: string, label: "Set" | "Light", value: string) {
  if (!value) return scene;
  const line = `${label}: ${value}`;
  if (new RegExp(`${label}:`, "i").test(scene)) {
    return scene.replace(new RegExp(`${label}:[\\s\\S]*?(?=\\s+(?:Set|Light|Camera):|$)`, "i"), `${line} `).trim();
  }
  return `${scene} ${line}.`.trim();
}

function lockRoom(scene: string) {
  return splicePart(splicePart(scene, "Set", OUTFIT_CHANGE_ROOM), "Light", OUTFIT_CHANGE_LIGHT);
}

function applyLook(scene: string, name: string, look: OutfitChangeLook) {
  return spliceCamera(
    spliceCharacterBlock(rewriteOutfitSafetyText(scene), characterLine(name, look)),
    OUTFIT_CHANGE_CAMERA,
  );
}

function shareSetAndLight(startScene: string, endScene: string) {
  return lockRoom(splicePart(endScene, "Light", scenePart(startScene, "Light") || OUTFIT_CHANGE_LIGHT));
}

function cameraMotion(seconds: number) {
  return `0–${seconds}s hold the same locked camera. She stays planted. One small natural breath or weight shift only. No walk, no spin, no bounce, no dressing. The clothes are already this clip's complete look. No voice. No background music. Camera: ${OUTFIT_CHANGE_CAMERA}.`;
}

function looksForPhaseA(phaseA: PhaseAProposal) {
  return assignOutfitChangeLooks(
    phaseA.clips.length,
    allReferenceIds(phaseA.clips),
    [phaseA.coreMessage, phaseA.hookStrategy, phaseA.narrativeArc].filter(Boolean).join(" "),
  );
}

function rewriteClip(clip: StoryboardRow, name: string, look: OutfitChangeLook, sfx: string) {
  const seconds = clip.durationSeconds || 5;
  const startScene = lockRoom(applyLook(clip.startScene || "", name, look));
  return {
    ...clip,
    narrativeJob: look.label,
    englishVo: "(no dialogue)",
    bgmSfx: `No background music. No voice. One sound effect only: ${sfx}.`,
    referenceImageIds: look.referenceImageIds.length ? look.referenceImageIds : clip.referenceImageIds,
    startScene,
    endScene: shareSetAndLight(startScene, applyLook(clip.endScene || "", name, look)),
    explainerScene: `Start: ${name} is already wearing ${look.label}. Camera: ${OUTFIT_CHANGE_CAMERA}. End: the same look, same pose, same empty cream-white room, same locked camera.`,
    motionCamera: cameraMotion(seconds),
  };
}

export function sanitizeOutfitChangeFrameScene(input: {
  scene: string;
  clipNumber: number;
  position: FramePosition;
  name?: string;
}) {
  let scene = rewriteOutfitSafetyText(input.scene);
  const undressed = /athletic shorts|crew-neck tank|holding a |putting on|guides? the|adjusting the/i.test(scene);
  if (undressed) {
    scene = spliceCharacterBlock(
      scene,
      characterLine(input.name?.trim() || "the character", {
        label: `Look ${input.clipNumber}`,
        referenceImageIds: [],
      }),
    );
  }
  return spliceCamera(lockRoom(scene), OUTFIT_CHANGE_CAMERA);
}

export function sanitizeOutfitChangePhaseA(phaseA: PhaseAProposal): PhaseAProposal {
  const name = castNameFromPhaseA(phaseA);
  const looks = looksForPhaseA(phaseA);
  return {
    ...phaseA,
    narrator: "No voiceover.",
    englishWordCount: 0,
    bgmDirection: "No background music. Sound effects only. No voice.",
    clips: phaseA.clips.map((clip, index) => {
      const look = looks[index] ?? { label: `Look ${index + 1}`, referenceImageIds: [] };
      const sfx = OUTFIT_CHANGE_SFX[index % OUTFIT_CHANGE_SFX.length];
      return rewriteClip(clip, name, look, sfx);
    }),
  };
}
