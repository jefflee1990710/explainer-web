import type { FramePosition, PhaseAProposal } from "@/model/project";
import { DUAL_KEYFRAME_MOTION_RULES } from "@/service/director/dual-keyframe-motion";

// Hook stays upright. The camera drops from above and punches in.
const HOOK_START_CAMERA =
  "right-side up, before the move: camera high above the head looking down, a wider shot with space above, head toward the top edge, shoulders in frame, focus crisp, no motion blur";

const HOOK_END_CAMERA =
  "right-side up, after the camera has dropped down and snapped a zoom-in: a tight close-up of the surprised face, camera now near eye level, head still toward the top edge, face much larger, focus crisp, no motion blur";

// Placement only. The selected text style supplies font, color, and texture.
export const SURPRISE_TYPE_STYLE = [
  "On-canvas type is this poster, not a white subtitle bar. Ignore any style rule that bans lettering.",
  "Stack the spoken line in full-width lines, flush left, nearly touching the left and right edges.",
  "Letters stay upright and sharp. No blur. Do not add a caption, a curved arrow, or the words SHOCK or SURPRISE HOOK.",
  "Lettering follows the selected text style Look. Do not invent a font, color, or texture, and do not copy typography from the visual style.",
].join(" ");

export const SURPRISE_HOOK_VIDEO_RULES = [
  "Clip 1 is the surprise hook. The person stays right-side up, head toward the top edge. Do not flip the picture.",
  "The camera starts above and travels downward while it snaps a zoom-in: a tiny hold, then one fast drop-and-punch that lands well under a second, then a hold on the tight face. Do not call the move smooth, slow, gentle, or a glide.",
  "Focus stays sharp and clear. No motion blur and no soft focus.",
  "The face moves into a clear surprise. On-canvas type uses the shock-poster style and stays upright.",
  "No background music.",
].join(" ");

export const SURPRISE_VARIETY_VIDEO_RULES = [
  "Clip 1 is always the surprise hook: the person stays right-side up, the camera drops from above and snaps a zoom-in, and the face moves into a clear surprise. Do not flip the picture.",
  "Every later clip is a hard cut to a different camera angle and a different body pose. Do not repeat the overhead zoom and do not copy the previous clip.",
  "Within one clip the camera and the body pose stay locked. Only the mouth and the expression move.",
  "Each clip pins the shock poster in one place, chosen from top, middle, and bottom. Neighbouring clips do not share that place. Letters stay upright. No white subtitle bar.",
  "No background music.",
].join(" ");

export type SurpriseSubtitlePlace = "top" | "middle" | "bottom";

const SUBTITLE_PLACES: SurpriseSubtitlePlace[] = ["top", "middle", "bottom"];

// Later clips each take one of these. Clip 1 stays the overhead surprise.
const INTERVIEW_ANGLES = [
  "eye-level medium close-up, camera straight on, character centered, right-side up",
  "low angle from below the chin on the left, right-side up",
  "high angle from just above the eyes on the right, right-side up",
  "three-quarter from the left at eye level, a step farther, right-side up",
  "three-quarter from the right at eye level, a half-step closer, right-side up",
  "medium shot from the lower-left, character still facing the lens, right-side up",
];

const INTERVIEW_POSES = [
  "seated and leaning forward, both hands on the knees",
  "seated upright, one hand raised in a small gesture, the other hand on the lap",
  "seated and leaning back, one arm along the chair, chin lifted",
  "seated with elbows on the knees and hands clasped",
  "standing with weight on one hip, one open hand toward the lens",
  "seated turned slightly sideways, one hand on the chair back, face toward the lens",
];

export type SurpriseClipVariety = {
  clipNumber: number;
  place: SurpriseSubtitlePlace;
  angle: string | null;
  pose: string | null;
};

function varietySeed(phaseA: PhaseAProposal) {
  const text = phaseA.clips.map((clip) => `${clip.clipNumber}:${clip.englishVo}`).join("|");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffle<T>(items: readonly T[], seed: number) {
  const out = [...items];
  let state = seed || 1;
  for (let index = out.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    const current = out[index]!;
    out[index] = out[swap]!;
    out[swap] = current;
  }
  return out;
}

// Use every option once before repeating. Neighbours never match.
function assignDistinct<T>(items: readonly T[], count: number, seed: number) {
  const deck = shuffle(items, seed);
  const out: T[] = [];
  for (let n = 0; n < count; n += 1) {
    if (n < deck.length) {
      out.push(deck[n]!);
      continue;
    }
    const last = out[out.length - 1];
    const choices = items.filter((item) => item !== last);
    const state = (Math.imul(seed + n + 1, 1664525) + 1013904223) >>> 0;
    out.push(choices[state % choices.length]!);
  }
  return out;
}

export function surpriseVarietyPlan(phaseA: PhaseAProposal): SurpriseClipVariety[] {
  const seed = varietySeed(phaseA);
  const places = assignDistinct(SUBTITLE_PLACES, phaseA.clips.length, seed);
  const later = Math.max(0, phaseA.clips.length - 1);
  const angles = assignDistinct(INTERVIEW_ANGLES, later, seed ^ 0x9e3779b9);
  const poses = assignDistinct(INTERVIEW_POSES, later, seed ^ 0x85ebca6b);
  return phaseA.clips.map((clip, index) => ({
    clipNumber: clip.clipNumber,
    place: places[index] ?? "top",
    angle: index === 0 ? null : (angles[index - 1] ?? INTERVIEW_ANGLES[0]),
    pose: index === 0 ? null : (poses[index - 1] ?? INTERVIEW_POSES[0]),
  }));
}

export function surprisePosterLayout(place: SurpriseSubtitlePlace) {
  if (place === "top") {
    return "SUBTITLE PLACE: TOP. Glue the poster to the top edge. Do not put it in the middle and do not glue it to the bottom. The person stays below the poster.";
  }
  if (place === "middle") {
    return "SUBTITLE PLACE: MIDDLE. Center the poster on the vertical middle. Do not touch the top edge and do not touch the bottom edge. Leave a clear gap above the poster and below it.";
  }
  return "SUBTITLE PLACE: BOTTOM. Glue the poster to the bottom edge. Do not put it in the middle and do not glue it to the top. The person stays above the poster.";
}

function varietyLock(place: SurpriseSubtitlePlace) {
  return `This clip has its own camera angle and its own body pose. Do not copy the previous clip. The picture is right-side up. Within this clip the camera stays locked. Do not zoom out and do not repeat the overhead surprise move. On-canvas type is the shock poster, pinned at the ${place} for the entire clip: same words, same size, same place. Do not fade it or restyle it into a white subtitle bar.`;
}

export function surpriseVideoMotionRules(clipNumber: number, place: SurpriseSubtitlePlace = "bottom") {
  if (clipNumber <= 1) {
    return `${SURPRISE_HOOK_VIDEO_RULES} The shock poster stays pinned at the ${place} for the whole clip.`;
  }
  return `${varietyLock(place)} ${DUAL_KEYFRAME_MOTION_RULES}`;
}

// Clip 1's end camera is a different size from its start. Later starts are a hard cut.
export function surpriseHookSkipsFrameAnchor(clipNumber: number, position: FramePosition = "start") {
  if (clipNumber <= 1) return true;
  return position === "start";
}

export function surpriseHookCameraDirective(position: FramePosition) {
  const camera = position === "end" ? HOOK_END_CAMERA : HOOK_START_CAMERA;
  return `HOOK CAMERA: ${camera}. The person stays upright. Do not flip the picture.`;
}

function spliceCamera(scene: string, camera: string) {
  if (/Camera:/i.test(scene)) {
    return scene.replace(/Camera:[\s\S]*$/i, `Camera: ${camera}.`).trim();
  }
  return `${scene} Camera: ${camera}.`.trim();
}

function stripInversion(scene: string) {
  return scene
    .replace(/\bupside[- ]down\b/gi, "")
    .replace(/\binverted(?:\s+180\s+degrees)?\b/gi, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function placeFraming(place: SurpriseSubtitlePlace) {
  if (place === "top") {
    return "Frame the person in the lower half so the poster can fill the top";
  }
  if (place === "middle") {
    return "Frame the head in the upper third and keep a clear gap under the poster before the bottom edge";
  }
  return "Frame the person in the upper half so the poster can fill only the bottom";
}

function applyHookCamera(scene: string, position: FramePosition, place: SurpriseSubtitlePlace) {
  const camera = position === "end" ? HOOK_END_CAMERA : HOOK_START_CAMERA;
  return spliceCamera(stripInversion(scene), `${camera}. ${placeFraming(place)}`);
}

function hookMotion(seconds: number, place: SurpriseSubtitlePlace) {
  const arrive = Math.min(1.2, Math.max(0.9, seconds - 1.5));
  return `0–0.15s hold the high start, person upright, sharp and clear; 0.15–${arrive}s the camera drops from above and snaps a zoom-in, picture stays right-side up, focus stays crisp; ${arrive}–${seconds}s hold the tight close-up while the face shows a clear surprise. The shock poster stays pinned at the ${place}. Sharp and quick, not a slow glide, not a flip.`;
}

function varietyMotion(seconds: number, place: SurpriseSubtitlePlace) {
  return `0–${seconds}s camera locked on this clip's own angle. Hold this body pose. Only the mouth and a small expression change. Do not zoom, reframe, or repeat the overhead surprise. The shock poster stays pinned at the ${place}. Picture stays right-side up. Hard cut from the previous clip.`;
}

function spliceCharacter(scene: string, character: string) {
  if (/Character:/i.test(scene)) {
    return scene.replace(/Character:\s*[\s\S]*?(?=Set:|Light:|Camera:|$)/i, `Character: ${character}. `).trim();
  }
  return `Character: ${character}. ${scene}`.trim();
}

function applyVariety(
  scene: string,
  name: string,
  pose: string,
  angle: string,
  position: FramePosition,
  place: SurpriseSubtitlePlace,
) {
  const mouth = position === "end" ? "mouth just closed after the line" : "mouth closed, about to speak";
  const withPose = spliceCharacter(stripInversion(scene), `${name}, ${pose}, eyes to the lens, ${mouth}`);
  return spliceCamera(withPose, `${angle}. ${placeFraming(place)}`);
}

function castLabel(phaseA: PhaseAProposal) {
  const head = phaseA.characterLock.split(/[：:]/)[0]?.trim() || "";
  if (head && head.length < 40) return head;
  return "the character";
}

// Last line is the yellow-bar payoff. A number in the ending makes that ending the payoff.
export function shockPosterLines(line: string) {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { body: [] as string[], payoff: "" };
  const last = words[words.length - 1] ?? "";
  const payoffCount =
    words.length <= 1
      ? words.length
      : /\d/.test(words.slice(-2).join(" "))
        ? 2
        : /[!?]$/.test(last)
          ? 1
          : words.length >= 6
            ? 2
            : 1;
  const payoff = words.slice(words.length - payoffCount).join(" ");
  const bodyWords = words.slice(0, words.length - payoffCount);
  const chunks: string[][] = [];
  let current: string[] = [];
  for (const word of bodyWords) {
    current.push(word);
    // A price or number ends its line, matching the poster stack.
    if (/\d/.test(word) || current.length >= 4) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length === 1 && chunks.length > 0) {
    chunks[chunks.length - 1]?.push(current[0]!);
  } else if (current.length > 0) {
    chunks.push(current);
  }
  return { body: chunks.map((chunk) => chunk.join(" ")), payoff };
}

export function surpriseTypeLines(input: {
  line: string;
  place: SurpriseSubtitlePlace;
  lookLine?: string;
}) {
  const spoken = input.line.trim();
  const stack = shockPosterLines(spoken);
  const rows = [
    ...stack.body.map((row, index) => `Line ${index + 1} (spell exactly): "${row}"`),
    `Line ${stack.body.length + 1} (spell exactly): "${stack.payoff}"`,
  ];
  return [
    "On-canvas type ON — highest priority. Paint only the lines below.",
    input.lookLine || "",
    SURPRISE_TYPE_STYLE,
    surprisePosterLayout(input.place),
    ...rows,
    `Spoken line (these words only, do not add words): "${spoken}"`,
  ].filter(Boolean);
}

export function surpriseAngleDirective(angle: string, pose: string) {
  return `THIS CLIP'S CAMERA AND POSE: ${angle}. Body: ${pose}. Different from the other clips. Do not copy another clip's angle or pose. The person stays upright.`;
}

export function sanitizeSurpriseFrameScene(input: {
  scene: string;
  clipNumber: number;
  position: FramePosition;
  name?: string;
  angle?: string | null;
  pose?: string | null;
  place?: SurpriseSubtitlePlace;
}) {
  const place = input.place ?? "top";
  if (input.clipNumber === 1) return applyHookCamera(input.scene, input.position, place);
  if (!input.angle || !input.pose) return input.scene;
  return applyVariety(input.scene, input.name || "the character", input.pose, input.angle, input.position, place);
}

export function sanitizeSurprisePhaseA(phaseA: PhaseAProposal): PhaseAProposal {
  const plan = surpriseVarietyPlan(phaseA);
  const name = castLabel(phaseA);
  return {
    ...phaseA,
    clips: phaseA.clips.map((clip, index) => {
      const item = plan[index];
      const place = item?.place ?? "top";
      if (index === 0) {
        const seconds = clip.durationSeconds || 3;
        return {
          ...clip,
          narrativeJob: "surprise",
          startScene: applyHookCamera(clip.startScene || "", "start", place),
          endScene: applyHookCamera(clip.endScene || "", "end", place),
          motionCamera: hookMotion(seconds, place),
        };
      }
      return {
        ...clip,
        startScene: applyVariety(clip.startScene || "", name, item?.pose || INTERVIEW_POSES[0], item?.angle || INTERVIEW_ANGLES[0], "start", place),
        endScene: applyVariety(clip.endScene || "", name, item?.pose || INTERVIEW_POSES[0], item?.angle || INTERVIEW_ANGLES[0], "end", place),
        motionCamera: varietyMotion(clip.durationSeconds || 4, place),
      };
    }),
  };
}
