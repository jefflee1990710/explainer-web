import type { FramePosition, PhaseAProposal, StoryboardRow } from "@/model/project";

// The clothing photo is the whole outfit. Only the character changes.
// Appended to every outfit clip prompt so a dressing action cannot slip back in.
export const OUTFIT_COVERED_SWAP =
  "The outfit stays exactly as in the first and last frames. Do not put clothes on or take them off. Do not change style or colour.";

export const OUTFIT_LOOK_LOCK =
  "wearing the complete outfit from the clothing reference, copied exactly for style, cut, colour, pattern, and details. Do not redesign, recolor, drop, or add any piece. Only the clothes change. The person is the character blueprint, not the model in the clothing photo.";

export const OUTFIT_IDENTITY_LOCK =
  "IDENTITY LOCK: the character image is one person. Copy her face shape, eyes, brows, nose, mouth, haircut, and hair length exactly. The person in the clothing photo is a different model. Do not copy that model's face, hair, hair length, skin, age, or body. Change only the clothes.";

export const OUTFIT_ENERGY =
  "She is energetic and happy: a bright open smile, lively eyes, open shoulders, feet planted. Not a blank, tired, or neutral face. No bounce and no head bob.";

export const OUTFIT_FRAME_GARMENT_LOCK =
  "Copy every garment in the clothing reference exactly: same style, cut, colour, pattern, and details. Do not drop, recolor, redesign, or add any piece. Only the character's face, hair, and body change. She is already dressed. Do not draw her putting clothes on.";

export const OUTFIT_VIDEO_MOTION_RULES = [
  "She is already wearing the complete outfit in both the first frame and the last frame. Do not put clothes on, take clothes off, or change a single garment, colour, or detail during the clip.",
  "The only motion is one camera rotation. She stays in the same pose, the same place, and the same size, with a bright smile and feet planted. She does not turn, walk, bounce, or bob her head, and she does not dress.",
  "The person stays the character from the blueprint. Only the clothes come from the clothing reference.",
  "The camera is one slow gimbal move: a single rotation on one axis for the whole clip. Same distance, same lens, and same subject size from the first frame to the last. No push, no zoom, no handheld shake, no whip, no snap, and no jump inside the clip.",
  "No spoken words, no voiceover, no narrator, and no lip-sync. englishVo is (no dialogue).",
  "No background music, no score, no underscore. One sound effect only, matching this clip's bgmSfx.",
  "The next clip is a hard cut to a different rotation, not a continuation of this camera.",
].join(" ");

export type OutfitCameraMove = {
  id: string;
  label: string;
  startLens: string;
  endLens: string;
  startCamera: string;
  endCamera: string;
  travel: string;
  sfx: string;
};

export type OutfitCameraOptions = { lenses?: boolean };

function shotLine(move: OutfitCameraMove, position: "start" | "end", lenses?: boolean) {
  const body = position === "start" ? move.startCamera : move.endCamera;
  const lens = position === "start" ? move.startLens : move.endLens;
  return lenses ? `${lens}, ${body}` : body;
}

function travelLine(move: OutfitCameraMove, lenses?: boolean) {
  if (!lenses) return move.travel;
  if (move.startLens === move.endLens) return `${move.travel}, staying on ${move.startLens}`;
  return `${move.travel}, ${move.startLens} to ${move.endLens}`;
}

// One rotation per clip. Start and end share the lens so the shot cannot zoom.
// Default order: left to right, then top to bottom, then the two reverse rotations.
export const OUTFIT_CAMERA_MOVES: readonly OutfitCameraMove[] = [
  {
    id: "left-to-right",
    label: "Left to right",
    startLens: "35mm f/1.4",
    endLens: "35mm f/1.4",
    startCamera:
      "eye-level full-body, camera on HER left, true three-quarter, same subject size, she faces forward, gimbal steady",
    endCamera:
      "eye-level full-body, camera on HER right, true three-quarter, SAME distance and SAME subject size, same pose, she faces forward, gimbal steady",
    travel:
      "one slow horizontal camera rotation only, from her left to her right. Same height, same distance, same subject size. No push, no zoom, no rise, no drop, no jump",
    sfx: "one soft cloth shift",
  },
  {
    id: "top-to-bottom",
    label: "Top to bottom",
    startLens: "50mm f/1.4",
    endLens: "50mm f/1.4",
    startCamera:
      "full-body from well above, looking down, same subject size, she faces forward, feet planted, gimbal steady",
    endCamera:
      "full-body from well below, looking up, SAME distance and SAME subject size, same pose, she faces forward, gimbal steady",
    travel:
      "one slow vertical camera rotation only, from above her head down to below. Same distance, same subject size. No push, no zoom, no side slide, no jump",
    sfx: "one soft room tone",
  },
  {
    id: "right-to-left",
    label: "Right to left",
    startLens: "35mm f/1.4",
    endLens: "35mm f/1.4",
    startCamera:
      "eye-level full-body, camera on HER right, true three-quarter, same subject size, she faces forward, gimbal steady",
    endCamera:
      "eye-level full-body, camera on HER left, true three-quarter, SAME distance and SAME subject size, same pose, she faces forward, gimbal steady",
    travel:
      "one slow horizontal camera rotation only, from her right to her left. Same height, same distance, same subject size. No push, no zoom, no rise, no drop, no jump",
    sfx: "one soft cloth shift",
  },
  {
    id: "bottom-to-top",
    label: "Bottom to top",
    startLens: "24mm f/1.2",
    endLens: "24mm f/1.2",
    startCamera:
      "full-body from well below, looking up, same subject size, she faces forward, feet planted, gimbal steady",
    endCamera:
      "full-body from well above, looking down, SAME distance and SAME subject size, same pose, she faces forward, gimbal steady",
    travel:
      "one slow vertical camera rotation only, from below up to above her head. Same distance, same subject size. No push, no zoom, no side slide, no jump",
    sfx: "one soft room tone",
  },
];

// Same body on the first and last frame. A pose change reads as a jump.
const PLANTED_POSE =
  "stands energetic and happy, bright open smile, lively eyes, open shoulders, both hands relaxed at her sides, feet planted in the same spot";

// One room for every still. A new background between frames reads as a jump.
const OUTFIT_ROOM =
  "one bright concrete studio: tall window on the left, one plant, one framed print, one black shelf on the right. Do not change this room.";

function shuffle<T>(items: readonly T[], random: () => number) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

// Distinct moves, reshuffled when the pool runs out, never the same move twice in a row.
export function assignOutfitCameraMoves(count: number, random: () => number = Math.random) {
  const picked: OutfitCameraMove[] = [];
  let bag = shuffle(OUTFIT_CAMERA_MOVES, random);
  while (picked.length < count) {
    if (bag.length === 0) bag = shuffle(OUTFIT_CAMERA_MOVES, random);
    let move = bag.shift();
    if (!move) break;
    const previous = picked[picked.length - 1];
    if (previous && move.id === previous.id) {
      const other = bag.find((item) => item.id !== move!.id);
      if (other) {
        bag = bag.filter((item) => item !== other);
        bag.push(move);
        move = other;
      }
    }
    picked.push(move);
  }
  return picked;
}

export function outfitCameraLine(scene: string) {
  return scene.match(/Camera:\s*(.+)$/i)?.[1]?.replace(/\.\s*$/, "").trim() || "";
}

// Leading line so the image model paints this still's camera, not the other still's.
export function outfitAngleDirective(clipNumber: number, position: FramePosition, scene: string) {
  const camera = outfitCameraLine(scene);
  const hardCut = clipNumber > 1 && position === "start" ? "NEW CAMERA. Hard cut. " : "";
  if (position === "end") {
    return `${hardCut}END FRAME CAMERA: ${camera}. Only the camera angle changes. Keep the same pose, the same room, the same distance, and the same subject size. Do not push in or zoom.`;
  }
  return `${hardCut}START FRAME CAMERA: ${camera}.`;
}

function rewriteRiskyWardrobe(text: string) {
  return text
    .replace(/plain white tight shorts only/gi, "the complete reference outfit")
    .replace(/white tight shorts/gi, "the reference outfit")
    .replace(/tight shorts/gi, "the reference outfit")
    .replace(/\b(?:pleated\s+)?mini skirt/gi, "pleated skirt")
    .replace(/at thigh height/gi, "at the waist")
    .replace(/at chest level/gi, "at the waist")
    .replace(/bare torso/gi, "covered torso")
    .replace(/pelvic area/gi, "waist")
    .replace(/\bpull(?:s|ing|ed)?\b/gi, (match, offset: number, full: string) => {
      const before = full.slice(Math.max(0, offset - 6), offset);
      const after = full.slice(offset, offset + 40);
      if (/never $/i.test(before)) return match;
      if (/laces?\b|tongue|shoe|sneaker/i.test(after)) return match;
      return "smooth";
    })
    .replace(/upward over (?:her |the )?hips/gi, "at the natural waist")
    .replace(/comes? up over (?:the |her )?hips/gi, "stays at the natural waist")
    .replace(/up over (?:the |her )?(?:hips|legs)/gi, "at the natural waist")
    .replace(/over (?:the |her )?hips/gi, "at the natural waist")
    .replace(/from (?:the )?thighs/gi, "at the waist");
}

export function rewriteOutfitSafetyText(text: string) {
  return rewriteRiskyWardrobe(text);
}

function castNameFromPhaseA(phaseA: Pick<PhaseAProposal, "characterLock" | "clips">) {
  const fromScene = phaseA.clips[0]?.startScene?.match(/Character:\s*([^,]+?)(?:\s+stands|\s+wears|,)/i);
  if (fromScene?.[1]) return fromScene[1].trim();
  const fromLock = phaseA.characterLock.split(/[：:]/)[0]?.trim();
  return fromLock || "the character";
}

function characterLine(name: string, pose: string) {
  return `Character: ${name} ${pose}, ${OUTFIT_LOOK_LOCK}`;
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

function cameraMotion(seconds: number, move: OutfitCameraMove, lenses?: boolean) {
  return `0–${seconds}s ${travelLine(move, lenses)}. Gimbal smooth and slow for the whole clip. No handheld shake, no whip, no snap, no jump inside the clip. She is already dressed in the target outfit, energetic and happy, bright smile, feet planted, no bounce. The person is the character blueprint. No voice. No background music. Start camera: ${shotLine(move, "start", lenses)}. End camera: ${shotLine(move, "end", lenses)}.`;
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

function applyMove(scene: string, name: string, pose: string, camera: string) {
  return spliceCamera(spliceCharacterBlock(rewriteRiskyWardrobe(scene), characterLine(name, pose)), camera);
}

export function sanitizeOutfitFrameScene(input: {
  scene: string;
  clipNumber: number;
  position: FramePosition;
  name?: string;
}) {
  let scene = rewriteRiskyWardrobe(input.scene);
  const undressed = /athletic shorts|crew-neck tank|holding a |putting on|guides? the|adjusting the/i.test(scene);
  if (undressed) {
    scene = spliceCharacterBlock(
      scene,
      characterLine(input.name?.trim() || "the character", PLANTED_POSE),
    );
  }
  return scene;
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

// The room and light stay on the end still, so a rotation cannot change the set.
function lockRoom(scene: string) {
  return splicePart(scene, "Set", OUTFIT_ROOM);
}

function shareSetAndLight(startScene: string, endScene: string) {
  return lockRoom(splicePart(endScene, "Light", scenePart(startScene, "Light")));
}

// Keep each clip's assigned rotation, and rewrite it so only the camera angle changes.
export function relockOutfitPhaseA(
  phaseA: PhaseAProposal,
  options?: OutfitCameraOptions,
): PhaseAProposal {
  const name = castNameFromPhaseA(phaseA);
  const lenses = options?.lenses;
  return {
    ...phaseA,
    narrator: "No voiceover.",
    englishWordCount: 0,
    bgmDirection: "No background music. Sound effects only. No voice.",
    clips: phaseA.clips.map((clip, index) => {
      const move =
        OUTFIT_CAMERA_MOVES.find((item) => item.label === clip.narrativeJob) ??
        OUTFIT_CAMERA_MOVES[index % OUTFIT_CAMERA_MOVES.length];
      const seconds = clip.durationSeconds || 3;
      const startCamera = shotLine(move, "start", lenses);
      const endCamera = shotLine(move, "end", lenses);
      const startScene = lockRoom(applyMove(clip.startScene || "", name, PLANTED_POSE, startCamera));
      return {
        ...clip,
        narrativeJob: move.label,
        englishVo: "(no dialogue)",
        bgmSfx: `No background music. No voice. One sound effect only: ${move.sfx}.`,
        startScene,
        endScene: shareSetAndLight(startScene, applyMove(clip.endScene || "", name, PLANTED_POSE, endCamera)),
        explainerScene: `Start: ${name} is already wearing the complete reference outfit. Camera: ${startCamera}. End: the same outfit, same pose, same room. Camera: ${endCamera}.`,
        motionCamera: cameraMotion(seconds, move, lenses),
      };
    }),
  };
}

export function sanitizeOutfitPhaseA(
  phaseA: PhaseAProposal,
  random: () => number = Math.random,
  options?: OutfitCameraOptions,
): PhaseAProposal {
  const name = castNameFromPhaseA(phaseA);
  const lenses = options?.lenses;
  const moves = assignOutfitCameraMoves(phaseA.clips.length, random);
  const referenceImageIds = allReferenceIds(phaseA.clips);
  return {
    ...phaseA,
    narrator: "No voiceover.",
    englishWordCount: 0,
    bgmDirection: "No background music. Sound effects only. No voice.",
    clips: phaseA.clips.map((clip, index) => {
      const move = moves[index] ?? OUTFIT_CAMERA_MOVES[0];
      const seconds = clip.durationSeconds || 3;
      const startCamera = shotLine(move, "start", lenses);
      const endCamera = shotLine(move, "end", lenses);
      const startScene = lockRoom(applyMove(clip.startScene || "", name, PLANTED_POSE, startCamera));
      return {
        ...clip,
        narrativeJob: move.label,
        englishVo: "(no dialogue)",
        bgmSfx: `No background music. No voice. One sound effect only: ${move.sfx}.`,
        referenceImageIds: referenceImageIds.length ? referenceImageIds : clip.referenceImageIds,
        startScene,
        endScene: shareSetAndLight(startScene, applyMove(clip.endScene || "", name, PLANTED_POSE, endCamera)),
        explainerScene: `Start: ${name} is already wearing the complete reference outfit. Camera: ${startCamera}. End: the same outfit, same pose, same room. Camera: ${endCamera}.`,
        motionCamera: cameraMotion(seconds, move, lenses),
      };
    }),
  };
}
