import type { FramePosition, PhaseAProposal } from "@/model/project";
import { DUAL_KEYFRAME_MOTION_RULES } from "@/service/director/dual-keyframe-motion";

// Hook stays upright. The camera drops from above and punches in.
const HOOK_START_CAMERA =
  "right-side up, before the move: camera high above the head looking down, a wider shot with space above, head toward the top edge, shoulders in frame, focus crisp, no motion blur";

const HOOK_END_CAMERA =
  "right-side up, after the camera has dropped down and snapped a zoom-in: a tight close-up of the surprised face, camera now near eye level, head still toward the top edge, face much larger, focus crisp, no motion blur";

export const SURPRISE_TYPE_STYLE = [
  "On-canvas type is this shock poster, not a white subtitle bar, not handwriting, and not a thin font. Ignore any style rule that bans lettering.",
  "Stack the spoken line in full-width lines, flush left, nearly touching the left and right edges.",
  "Font: ultra-bold ultra-condensed gothic sans, all caps, very tight leading, scratched distressed ink.",
  "Body lines are white. Yellow is only for a digit, a price, or a percent, at the same size. A name stays white, including a product or brand name. Every other body word stays white.",
  "The last line is the payoff: black letters on a thick mustard-yellow dry-brush bar, edge to edge, slightly tilted, rough painted ends, with a thinner yellow stroke just under the bar.",
  "Letters stay upright and sharp. No blur. Do not add a caption, a curved arrow, or the words SHOCK or SURPRISE HOOK.",
].join(" ");

export const SURPRISE_HOOK_VIDEO_RULES = [
  "Clip 1 is the surprise hook. The person stays right-side up, head toward the top edge. Do not flip the picture.",
  "The camera starts above and travels downward while it snaps a zoom-in: a tiny hold, then one fast drop-and-punch that lands well under a second, then a hold on the tight face. Do not call the move smooth, slow, gentle, or a glide.",
  "Focus stays sharp and clear. No motion blur and no soft focus.",
  "The face moves into a clear surprise. On-canvas type uses the shock-poster style and stays upright.",
  "No background music.",
].join(" ");

const INTERVIEW_LOCK =
  "This is a seated interview clip. The picture is right-side up. Camera stays locked at the first frame's size. Do not zoom out, do not reframe, and do not repeat the overhead zoom-in. On-canvas type is the same shock poster, smaller, placed at the bottom as the subtitle, and it stays pinned there for the entire clip: same words, same size, same place, black field and yellow bar included. Do not fade it, crop it, or restyle it into a white subtitle bar.";

export function surpriseVideoMotionRules(clipNumber: number) {
  if (clipNumber <= 1) return SURPRISE_HOOK_VIDEO_RULES;
  return `${INTERVIEW_LOCK} ${DUAL_KEYFRAME_MOTION_RULES}`;
}

export function surpriseHookSkipsFrameAnchor(clipNumber: number) {
  return clipNumber <= 1;
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

function applyHookCamera(scene: string, position: FramePosition) {
  const camera = position === "end" ? HOOK_END_CAMERA : HOOK_START_CAMERA;
  return spliceCamera(stripInversion(scene), camera);
}

export function sanitizeSurpriseFrameScene(input: {
  scene: string;
  clipNumber: number;
  position: FramePosition;
}) {
  if (input.clipNumber !== 1) return input.scene;
  return applyHookCamera(input.scene, input.position);
}

function hookMotion(seconds: number) {
  const arrive = Math.min(1.2, Math.max(0.9, seconds - 1.5));
  return `0–0.15s hold the high start, person upright, sharp and clear; 0.15–${arrive}s the camera drops from above and snaps a zoom-in, picture stays right-side up, focus stays crisp; ${arrive}–${seconds}s hold the tight close-up while the face shows a clear surprise. Sharp and quick, not a slow glide, not a flip.`;
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

export function surpriseTypeLines(input: { clipNumber: number; line: string }) {
  const spoken = input.line.trim();
  const stack = shockPosterLines(spoken);
  const rows = [
    ...stack.body.map((row, index) => {
      const color = /\d/.test(row)
        ? "a number or price on this line is mustard yellow"
        : "every word on this line is white";
      return `Line ${index + 1}, white body, all caps (${color}): "${row}"`;
    }),
    `Line ${stack.body.length + 1}, PAYOFF, black all-caps letters on the mustard-yellow dry-brush bar: "${stack.payoff}"`,
  ];
  const layout =
    input.clipNumber <= 1
      ? "Layout: huge scale. A solid black rectangle sits behind the type only, from the top edge down to just under the yellow bar. The face stays visible underneath, right-side up."
      : "Layout: the same shock poster, smaller, placed at the bottom as the subtitle. A solid black rectangle sits behind this bottom type only, from just above the first line to the bottom edge. The seated face stays clear above it. If another frame is attached, ignore its lettering and paint only these lines.";
  return [
    "On-canvas shock type ON — highest priority. Paint only the lines below.",
    SURPRISE_TYPE_STYLE,
    layout,
    ...rows,
    `Spoken line (these words only, do not add words): "${spoken}"`,
  ];
}

export function sanitizeSurprisePhaseA(phaseA: PhaseAProposal): PhaseAProposal {
  return {
    ...phaseA,
    clips: phaseA.clips.map((clip) => {
      if (clip.clipNumber !== 1) return clip;
      const seconds = clip.durationSeconds || 3;
      return {
        ...clip,
        narrativeJob: "surprise",
        startScene: applyHookCamera(clip.startScene || "", "start"),
        endScene: applyHookCamera(clip.endScene || "", "end"),
        motionCamera: hookMotion(seconds),
      };
    }),
  };
}
