import type { VoLanguage } from "@/model/project";
import { sceneStateLabels } from "@/service/director/languages";

// How far start → end may travel on the same locked camera, scaled by clip seconds.
// Too little delta and I2V has nothing to animate; too much and it looks like a cut.

export type KeyframeDeltaBand = "3s" | "4s" | "5-6s" | "7-8s";

export function clampClipSeconds(durationSeconds: number) {
  return Math.min(8, Math.max(3, Math.round(durationSeconds)));
}

export function keyframeDeltaBand(durationSeconds: number): KeyframeDeltaBand {
  const seconds = clampClipSeconds(durationSeconds);
  if (seconds <= 3) return "3s";
  if (seconds <= 4) return "4s";
  if (seconds <= 6) return "5-6s";
  return "7-8s";
}

const BUDGET: Record<KeyframeDeltaBand, { director: string; start: string; end: string }> = {
  "3s": {
    director:
      "3s: one small readable beat — a head/hand turn, one prop slides about 1/4 of the frame, or a wash blooms. Still the same pose scale.",
    start: "Opening at t=0s, before that 3s beat. Leave room for one small change.",
    end: "After 3s on the SAME locked camera: one clear completed beat (turn, short slide, or bloom). Difference must be obvious enough to animate; do not look like a duplicate of the start.",
  },
  "4s": {
    director:
      "4s: one beat plus follow-through — pose shifts and one element fully enters or leaves the frame.",
    start: "Opening at t=0s, before the 4s beat and follow-through.",
    end: "After 4s on the SAME locked camera: the beat has finished (pose shifted; one element fully in or out). Readable travel, no cut or teleport.",
  },
  "5-6s": {
    director:
      "5–6s: two beats — opening state → mid change → resting payoff (e.g. a cloud becomes a flower while the character looks up). Props may travel ~1/3 of the frame.",
    start: "Opening at t=0s of a 5–6s two-beat clip, before any of that motion.",
    end: "After 5–6s on the SAME locked camera: both beats are done (payoff pose, morph complete, props at their new place). Must read as a later moment, not a near-copy of the start.",
  },
  "7-8s": {
    director:
      "7–8s: two stronger beats — a step or a prop crossing much of the frame, plus a completed morph. Character stays in-frame at similar size; still no new camera.",
    start: "Opening at t=0s of a 7–8s clip, before the longer travel.",
    end: "After 7–8s on the SAME locked camera: the longer travel has landed. Clear spatial change so I2V can animate the full duration; no jump cut or teleport.",
  },
};

export function keyframeDeltaDirectorBlock(options?: {
  separateStills?: boolean;
  language?: VoLanguage;
  // Whiteboard explainer with a cast: walk and zoom are allowed.
  performance?: boolean;
}) {
  const labels = sceneStateLabels(options?.language);
  const combined =
    labels.start === "Start"
      ? 'explainerScene writes both states in one English paragraph: "Start: …. End (Ns later): …" using that clip\'s durationSeconds.'
      : "explainerScene writes both states in one paragraph: 「起始：…。結尾（N秒後）：…」 using that clip's durationSeconds. Write that paragraph in the scene description language.";
  const stillRule = options?.separateStills
    ? "startScene is the t=0 still and endScene is the t=N still (use that clip's durationSeconds). Do not merge them into one paragraph. Write both in the scene description language."
    : combined;
  return [
    options?.performance
      ? "When a character is on screen, start and end are one continuous shot that may zoom in or out. The character may begin on the left or the right, run or jump toward the other side, point, pull, or push a drawn element, and turn their head left or right. Shot size and placement MAY differ. Each clip uses a different action and a different side so the performance does not repeat. Still no cut and no teleport."
      : "Each clip's start and end are the SAME locked camera; the character keeps roughly the same screen size and placement.",
    "Each still shows exactly ONE instance of each named character — two moments of the same figure, never two bodies in one frame.",
    `They must NOT look almost identical — under-moving makes the video freeze. ${stillRule}`,
    "motionCamera names the path and how far things travel so interpolation can fill the seconds (see the motionCamera contract). Do not put the in-between action inside start or end still text.",
    "Change budget by durationSeconds:",
    ...(options?.performance
      ? [
          "- 3s: one fresh action (a point, a head turn, a small jump, or a push) plus a facial-expression change and one new doodle. A small zoom is enough.",
          "- 4s: a run, jump, pull, or push finishes, the head turns the other way, and one object draws on or leaves. The zoom may complete.",
          "- 5–6s: the character crosses toward the other side of the frame with a new action; extra drawings appear.",
          "- 7–8s: a longer run or a jump plus a pull or push, and a clear zoom in or out. One figure, still in frame. No cut.",
          "A zoom is allowed. The character may jump or run. Never jump-cut or teleport the character. Do not repeat the previous clip's action.",
        ]
      : [
          `- ${BUDGET["3s"].director}`,
          `- ${BUDGET["4s"].director}`,
          `- ${BUDGET["5-6s"].director}`,
          `- ${BUDGET["7-8s"].director}`,
          "Never invent a new camera, a jump cut, or a character teleporting across the frame.",
        ]),
  ].join("\n");
}

export function frameStartMoment(
  clipNumber: number,
  durationSeconds: number,
  performance = false,
) {
  const seconds = clampClipSeconds(durationSeconds);
  const band = keyframeDeltaBand(seconds);
  const camera = performance
    ? "The end frame may place them on the other side, with a different head direction, after a run, jump, point, pull, or push."
    : "Keep a single locked camera the end frame will continue.";
  return `This is the FIRST frame (t=0s) of clip ${clipNumber} (${seconds}s). ${BUDGET[band].start} ${camera}`;
}

export function frameEndMoment(
  clipNumber: number,
  durationSeconds: number,
  nextScene?: string,
  performance = false,
) {
  const seconds = clampClipSeconds(durationSeconds);
  const band = keyframeDeltaBand(seconds);
  // Do not paste the next clip's full scene — Flare rejects prompts over ~5000 chars.
  const handoff = nextScene
    ? performance
      ? " It must visually hand off to the next clip in the same world."
      : " It must visually hand off to the next clip on the same locked camera."
    : " It is the final frame of the video: end on a clean resting payoff. Do not match or bridge back to clip 1.";
  const change = performance
    ? "The action has landed: different body pose, facial expression, head direction, and often the other side of the frame."
    : BUDGET[band].end;
  const camera = performance
    ? " Shot size and which side they stand on may differ from the start because they ran, jumped, or the camera zoomed."
    : " Same camera, character size, and screen position.";
  return `This is the LAST frame of clip ${clipNumber} (t=${seconds}s). ${change}${camera}${handoff}`;
}
