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

export function keyframeDeltaDirectorBlock(options?: { separateStills?: boolean }) {
  const stillRule = options?.separateStills
    ? "startScene is the t=0 still and endScene is the t=N still (use that clip's durationSeconds). Do not merge them into one paragraph."
    : "explainerScene writes both states in one paragraph: 「起始：…。結尾（N秒後）：…」 using that clip's durationSeconds.";
  return [
    "Each clip's start and end are the SAME locked camera; the character keeps roughly the same screen size and placement.",
    `They must NOT look almost identical — under-moving makes the video freeze. ${stillRule}`,
    "motionCamera names the path and how far things travel so interpolation can fill the seconds.",
    "Change budget by durationSeconds:",
    `- ${BUDGET["3s"].director}`,
    `- ${BUDGET["4s"].director}`,
    `- ${BUDGET["5-6s"].director}`,
    `- ${BUDGET["7-8s"].director}`,
    "Never invent a new camera, a jump cut, or a character teleporting across the frame.",
  ].join("\n");
}

export function frameStartMoment(clipNumber: number, durationSeconds: number) {
  const seconds = clampClipSeconds(durationSeconds);
  const band = keyframeDeltaBand(seconds);
  return `This is the FIRST frame (t=0s) of clip ${clipNumber} (${seconds}s). ${BUDGET[band].start} Keep a single locked camera the end frame will continue.`;
}

export function frameEndMoment(
  clipNumber: number,
  durationSeconds: number,
  nextScene?: string,
) {
  const seconds = clampClipSeconds(durationSeconds);
  const band = keyframeDeltaBand(seconds);
  const handoff = nextScene
    ? ` It must visually hand off to the next clip, which opens with: ${nextScene}`
    : " It is the final frame of the video: end on a clean resting payoff. Do not match or bridge back to clip 1.";
  return `This is the LAST frame of clip ${clipNumber} (t=${seconds}s). ${BUDGET[band].end} Same camera, character size, and screen position.${handoff}`;
}
