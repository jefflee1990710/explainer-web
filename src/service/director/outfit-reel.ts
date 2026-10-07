import type { FramePosition, PhaseAProposal, StoryboardRow } from "@/model/project";

// Modest sportswear start. "Tight shorts" and hand-held garments trip image safety.
export const OUTFIT_BASE_LOOK =
  "an opaque white crew-neck tank that covers the shoulders and torso, plus white knee-length athletic shorts";

export const OUTFIT_CLIP1_START_LOCK =
  "Only the Scene garments are on: an opaque white crew-neck tank covering the shoulders and torso, plus white knee-length athletic shorts, hands at the sides. Do not draw a skirt, socks, shoes, bag, dress, or extra layers.";

export const OUTFIT_CLIP1_START_MOTION = "0–1s she stands still with both hands relaxed at the sides";

// Dual-keyframe pull-ups expose a gap between tank and waistband. Keep the swap at the waist.
export const OUTFIT_COVERED_SWAP =
  "The torso stays covered for the whole clip. Never lower a waistband below the navel. Never pull a skirt, shorts, trousers, or dress up from the thighs. A new bottom is already at the natural waist; the previous shorts vanish underneath it. Hands only smooth or fasten the waistband. Never show a gap between the tank and the waistband.";

export const OUTFIT_VIDEO_MOTION_RULES = [
  "This clip's start and end stills are the SAME CAMERA ANGLE, attached as first/last frames.",
  OUTFIT_COVERED_SWAP,
  "Do not write pulls, yanks, or a waistband sliding up the legs. Dual-keyframe interpolation must not create an in-between where the waistband sits on the thighs.",
  "Body motion is required: weight shift, a look down at the garment, a 3/4 turn of the torso, arms sliding into sleeves, or a step into shoes. Do not leave her frozen facing camera with only the hands moving.",
  "Timed beats match the garment. Hands fasten or smooth a piece already at the waist. Shoes and socks: look down and step in at the feet. A cardigan or layer: slide arms into sleeves; never pull anything over the head.",
  "Camera is locked for THIS clip only. Later clips cut to a different full-body angle. Do not copy a facing-forward stance from the previous clip.",
].join(" ");

type OutfitShot = {
  camera: string;
  startPose: string;
  endPose: string;
};

const FRONT_SHOT: OutfitShot = {
  camera: "locked eye-level full-body shot, subject centered, facing the camera",
  startPose: "stands centered facing forward, both hands relaxed at the sides",
  endPose: "stands centered facing forward, weight shifted onto one hip, hands relaxing at the sides",
};

const THREE_Q_LEFT: OutfitShot = {
  camera: "locked eye-level full-body 3/4 from camera-left, head to feet in frame",
  startPose: "stands in a 3/4 turn toward camera-left, looking down at the garment, weight on the back foot",
  endPose: "stands in the same 3/4 toward camera-left, looking toward the lens, weight settled on one hip",
};

const THREE_Q_RIGHT: OutfitShot = {
  camera: "locked eye-level full-body 3/4 from camera-right, showing both shoulders and the open front",
  startPose: "stands in a 3/4 turn toward camera-right, the near arm slightly lifted toward a sleeve",
  endPose: "stands in the same 3/4 toward camera-right, shoulders relaxed, hands at the sides",
};

const FEET_LEFT: OutfitShot = {
  camera: "locked slightly-low full-body 3/4 from camera-left, ankles and feet readable, head still in frame",
  startPose: "stands in a 3/4 turn toward camera-left, looking down at the feet, one knee softly bent",
  endPose: "stands in the same slightly-low 3/4, looking back up toward camera-left, weight settled",
};

const FEET_RIGHT: OutfitShot = {
  camera: "locked slightly-low full-body 3/4 from camera-right, ankles and feet readable, head still in frame",
  startPose: "stands in a 3/4 turn toward camera-right, looking down at the feet, one knee softly bent",
  endPose: "stands in the same slightly-low 3/4, looking back up toward camera-right, weight settled",
};

const HOLD_SHOT: OutfitShot = {
  camera: "locked eye-level full-body 3/4 from camera-left, the finished look readable from head to feet",
  startPose: "stands in a 3/4 toward camera-left, weight on the back hip, looking toward the lens",
  endPose: "settles the same 3/4 with a small confident smile, chin slightly turned to show the outfit",
};

export function outfitShotForClip(clipNumber: number, narrativeJob: string): OutfitShot {
  if (clipNumber <= 1) return FRONT_SHOT;
  const job = narrativeJob.toLowerCase();
  if (job === "hold") return HOLD_SHOT;
  if (/sock/.test(job)) return clipNumber % 2 === 0 ? FEET_LEFT : FEET_RIGHT;
  // Shoes stay eye-level 3/4 — a low angle on a skirt clip trips image safety.
  if (/shoe|sneaker|boot/.test(job)) return clipNumber % 2 === 0 ? THREE_Q_LEFT : THREE_Q_RIGHT;
  if (/cardigan|jacket|coat|blazer|overshirt|hoodie|layer/.test(job)) return THREE_Q_RIGHT;
  return clipNumber % 2 === 0 ? THREE_Q_LEFT : THREE_Q_RIGHT;
}

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

function isBottomSwap(clip: StoryboardRow) {
  return /skirt|shorts|trousers|pants|bottom|dress/i.test(clip.narrativeJob);
}

function coveredBottomMotion(seconds: number, firstBeat: string) {
  const end = Math.max(seconds - 0.5, 2);
  return `${firstBeat}; 1–${end}s both hands smooth and fasten the waistband already at the natural waist as the previous shorts vanish underneath, torso covered, waistband never below the navel; ${end}–${seconds}s the hands drop to the sides. Camera locked.`;
}

function outfitMotionForClip(clip: StoryboardRow, shot: OutfitShot) {
  const seconds = clip.durationSeconds || 3;
  const mid = Math.max(seconds - 0.6, 2);
  const cam = `Camera locked: ${shot.camera}.`;
  const job = clip.narrativeJob.toLowerCase();
  if (clip.clipNumber === 1) {
    return isBottomSwap(clip)
      ? coveredBottomMotion(seconds, OUTFIT_CLIP1_START_MOTION)
      : clip.motionCamera.replace(/^[^;；]+/, OUTFIT_CLIP1_START_MOTION);
  }
  if (job === "hold") {
    return `0–${mid}s she shifts weight onto the back hip, turns the chin toward the lens, and lets the finished look settle; ${mid}–${seconds}s she holds the 3/4. ${cam}`;
  }
  if (isBottomSwap(clip)) {
    return `0–1s she settles into the 3/4 and looks down at the waist; 1–${mid}s both hands smooth and fasten the waistband already at the natural waist as the previous shorts vanish underneath, torso covered, waistband never below the navel; ${mid}–${seconds}s she looks up and settles. ${cam}`;
  }
  if (/cardigan|jacket|coat|blazer|overshirt|hoodie|layer/.test(job)) {
    return `0–0.8s she turns into the 3/4 and lifts the near arm; 0.8–${mid}s first one arm then the other slides into the sleeves — never over the head — as the layer settles on the shoulders; ${mid}–${seconds}s both hands smooth the open front and drop. ${cam}`;
  }
  if (/sock/.test(job)) {
    return `0–0.7s she looks down and bends at the knees, torso still covered; 0.7–${mid}s both hands smooth the sock onto the visible ankle; ${mid}–${seconds}s she rises into the 3/4 and looks toward camera. ${cam}`;
  }
  if (/shoe|sneaker|boot/.test(job)) {
    return `0–1s she looks down and steps the visible foot into the shoe; 1–${mid}s both hands smooth the tongue and fasten the laces; ${mid}–${seconds}s she stands into the 3/4, looking up. ${cam}`;
  }
  return `0–1s she shifts weight and looks toward the new piece; 1–${mid}s both hands smooth and settle that garment; ${mid}–${seconds}s she drops the hands and holds the new angle. ${cam}`;
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

function splicePose(scene: string, pose: string) {
  if (/Character:/i.test(scene) && /stands|standing/i.test(scene)) {
    return scene.replace(
      /(Character:\s*[^,]+?)\s+(?:stands|standing)[\s\S]*?(?=,\s*wearing| wearing|, fully dressed| fully dressed|, guiding|, adjusting|, stepping)/i,
      `$1 ${pose}`,
    );
  }
  return scene;
}

function spliceCamera(scene: string, camera: string) {
  if (/Camera:/i.test(scene)) {
    return scene.replace(/Camera:[\s\S]*$/i, `Camera: ${camera}.`).trim();
  }
  return `${scene} Camera: ${camera}.`.trim();
}

// Start stills are a new angle on clothes already on, not mid-dressing.
function stripStartDressingAction(scene: string) {
  return scene.replace(
    /,\s*(?:guiding|adjusting|stepping(?: down)? into|holding|sliding)[\s\S]*?(?=\s*Set:)/i,
    ".",
  );
}

function feetLock(clips: StoryboardRow[], clipNumber: number, position: FramePosition) {
  const onBy = (pattern: RegExp) =>
    clips.some((clip) => {
      if (!pattern.test(clip.narrativeJob)) return false;
      return clip.clipNumber < clipNumber || (clip.clipNumber === clipNumber && position === "end");
    });
  if (onBy(/shoe|sneaker|boot/i)) return "";
  if (onBy(/sock/i)) return "Socks are on. Do not draw shoes or sneakers.";
  return "Bare feet. Do not draw socks, shoes, or sneakers.";
}

function appendFeetLock(scene: string, lock: string) {
  if (!lock) return scene;
  if (/Bare feet|Do not draw shoes/i.test(scene)) return scene;
  if (/Set:/i.test(scene)) return scene.replace(/Set:/i, `${lock} Set:`);
  return `${scene} ${lock}`;
}

function applyShot(scene: string, pose: string, camera: string) {
  return spliceCamera(splicePose(scene, pose), camera);
}

function sanitizeClip(clip: StoryboardRow, name: string, clips: StoryboardRow[]): StoryboardRow {
  let startScene = rewriteRiskyWardrobe(clip.startScene || "");
  let endScene = rewriteRiskyWardrobe(clip.endScene || "");
  let explainerScene = rewriteRiskyWardrobe(clip.explainerScene);
  let motionCamera = rewriteRiskyWardrobe(clip.motionCamera);
  const shot = outfitShotForClip(clip.clipNumber, clip.narrativeJob);
  if (clip.clipNumber === 1) {
    startScene = spliceCharacterBlock(startScene, outfitClip1StartCharacter(name));
    const startLine = `Start: ${name} stands centered facing the camera, wearing ${OUTFIT_BASE_LOOK}, hands relaxed at the sides.`;
    explainerScene = /Start:/i.test(explainerScene)
      ? explainerScene.replace(/Start:[\s\S]*?(?=End:|$)/i, `${startLine} `).trim()
      : `${startLine} ${explainerScene}`.trim();
    motionCamera = outfitMotionForClip({ ...clip, motionCamera }, shot);
  } else {
    startScene = stripStartDressingAction(applyShot(startScene, shot.startPose, shot.camera));
    endScene = applyShot(endScene, shot.endPose, shot.camera);
    motionCamera = outfitMotionForClip({ ...clip, motionCamera }, shot);
  }
  startScene = appendFeetLock(startScene, feetLock(clips, clip.clipNumber, "start"));
  endScene = appendFeetLock(endScene, feetLock(clips, clip.clipNumber, "end"));
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
    clips: phaseA.clips.map((clip) => sanitizeClip(clip, name, phaseA.clips)),
  };
}
