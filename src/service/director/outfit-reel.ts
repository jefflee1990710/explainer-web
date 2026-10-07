import type { FramePosition, PhaseAProposal, StoryboardRow } from "@/model/project";

// The clothing photo is the whole outfit. Only the character changes.
export const OUTFIT_LOOK_LOCK =
  "wearing the complete outfit from the clothing reference, copied exactly for style, cut, colour, pattern, and details. Do not redesign, recolor, drop, or add any piece. Only the character changes.";

export const OUTFIT_FRAME_GARMENT_LOCK =
  "Copy every garment in the clothing reference exactly: same style, cut, colour, pattern, and details. Do not drop, recolor, redesign, or add any piece. Only the character's face, hair, and body change. She is already dressed. Do not draw her putting clothes on.";

export const OUTFIT_VIDEO_MOTION_RULES = [
  "She is already wearing the complete outfit in both the first frame and the last frame. Do not put clothes on, take clothes off, or change a single garment, colour, or detail during the clip.",
  "The only motion is the camera move named in this clip, plus a small pose settle. She stays planted. She does not turn her body to follow the lens and does not dress.",
  "The camera move is sharp and quick: a short hold, then one decisive move that lands before the clip ends, then a hold on the end frame. Do not write a slow glide.",
  "No spoken words, no voiceover, no narrator, and no lip-sync. englishVo is (no dialogue).",
  "No background music, no score, no underscore. One sound effect only, matching this clip's bgmSfx.",
  "The next clip is a hard cut to a different camera move, not a continuation of this camera.",
].join(" ");

export type OutfitCameraMove = {
  id: string;
  label: string;
  startCamera: string;
  endCamera: string;
  travel: string;
  sfx: string;
};

// One move per clip. Order is shuffled on every plan so the same reel does not repeat.
export const OUTFIT_CAMERA_MOVES: readonly OutfitCameraMove[] = [
  {
    id: "front",
    label: "Front",
    startCamera:
      "locked eye-level full-body, camera directly in front of her, she faces the lens, head to shoes in frame",
    endCamera:
      "the same eye-level front, camera a half-step closer, she still faces the lens, head to shoes in frame",
    travel: "the camera punches in a half-step on the front view and stops",
    sfx: "one soft fabric rustle",
  },
  {
    id: "front-top-forward",
    label: "Front top move forward",
    startCamera:
      "high front, camera above her head looking slightly down, full body with floor in frame, head to shoes visible",
    endCamera:
      "eye-level front after the camera has moved forward and down, closer full body, head to shoes still in frame",
    travel: "the camera drops from above and pushes forward to an eye-level front",
    sfx: "one short whoosh",
  },
  {
    id: "front-zoom-out",
    label: "Front zoom out",
    startCamera:
      "eye-level front, closer full body, she fills the frame, head and shoes just inside the edges",
    endCamera:
      "eye-level front after the camera has pulled back, more room around her, head to shoes with space above and below",
    travel: "the camera zooms out from the close front to a wider full-body front",
    sfx: "one reverse whoosh",
  },
  {
    id: "front-to-left",
    label: "Front to left",
    startCamera: "eye-level full-body directly in front, she faces the lens, head to shoes in frame",
    endCamera:
      "eye-level full-body 3/4 after the camera has arced to HER left, a clear 3/4 of her right side, head to shoes in frame",
    travel: "the camera arcs from the front to her left. Her feet stay planted; she does not spin",
    sfx: "one arc whoosh",
  },
  {
    id: "front-to-right",
    label: "Front to right",
    startCamera: "eye-level full-body directly in front, she faces the lens, head to shoes in frame",
    endCamera:
      "eye-level full-body 3/4 after the camera has arced to HER right, a clear 3/4 of her left side, head to shoes in frame",
    travel: "the camera arcs from the front to her right. Her feet stay planted; she does not spin",
    sfx: "one arc whoosh",
  },
  {
    id: "low-rise",
    label: "Low rise to front",
    startCamera:
      "low front, camera near the floor looking up, shoes closer to the lens, full body and face still in frame",
    endCamera: "eye-level front after the camera has risen, balanced full body, head to shoes in frame",
    travel: "the camera rises from the floor to an eye-level front",
    sfx: "one rising whoosh",
  },
  {
    id: "orbit",
    label: "Orbit across the front",
    startCamera:
      "eye-level full-body 3/4 from HER left, a clear 3/4 of her right side, head to shoes in frame",
    endCamera:
      "eye-level full-body 3/4 from HER right, a clear 3/4 of her left side, head to shoes in frame",
    travel: "the camera orbits across the front from her left to her right. Her feet stay planted",
    sfx: "one traveling whoosh",
  },
  {
    id: "lateral-slide",
    label: "Lateral slide",
    startCamera:
      "eye-level full-body, camera offset to frame-left so she stands on the right third, head to shoes in frame",
    endCamera:
      "eye-level full-body, camera has slid to frame-right so she stands on the left third, same size, head to shoes in frame",
    travel: "the camera slides sideways across the front with a parallax on the room. She stays planted",
    sfx: "one sliding whoosh",
  },
];

const START_POSE = "stands with both hands relaxed at the sides, weight even";
const END_POSE = "stands with both hands relaxed at the sides, weight on the back hip, a small smile";

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
    return `${hardCut}END FRAME CAMERA: ${camera}. This is the end of the camera move. Do not copy the start frame's angle, height, or distance.`;
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

function cameraMotion(seconds: number, move: OutfitCameraMove) {
  const arrive = Math.min(1.4, Math.max(1, seconds - 0.8));
  return `0–0.2s hold the start frame; 0.2–${arrive}s ${move.travel}; ${arrive}–${seconds}s hold the end frame. Sharp and quick, one decisive camera move, then a hold. She is already dressed and stays planted. No voice. No background music. Start camera: ${move.startCamera}. End camera: ${move.endCamera}.`;
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
      characterLine(input.name?.trim() || "the character", START_POSE),
    );
  }
  return scene;
}

export function sanitizeOutfitPhaseA(
  phaseA: PhaseAProposal,
  random: () => number = Math.random,
): PhaseAProposal {
  const name = castNameFromPhaseA(phaseA);
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
      return {
        ...clip,
        narrativeJob: move.label,
        englishVo: "(no dialogue)",
        bgmSfx: `No background music. No voice. One sound effect only: ${move.sfx}.`,
        referenceImageIds: referenceImageIds.length ? referenceImageIds : clip.referenceImageIds,
        startScene: applyMove(clip.startScene || "", name, START_POSE, move.startCamera),
        endScene: applyMove(clip.endScene || "", name, END_POSE, move.endCamera),
        explainerScene: `Start: ${name} is already wearing the complete reference outfit. Camera: ${move.startCamera}. End: the same outfit, no new garment. Camera: ${move.endCamera}.`,
        motionCamera: cameraMotion(seconds, move),
      };
    }),
  };
}
