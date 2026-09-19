// Shared Wan dual-keyframe motion contract. Start and end stills are the
// same shot; the clip must interpolate across the full duration.

export const DUAL_KEYFRAME_MOTION_RULES = [
  "The start and end storyboard images for this clip are the SAME SHOT, attached as first/last frames.",
  "Interpolate smoothly across the FULL duration — do not hold the start pose then snap or hard-cut to the end image in the last frames.",
  "Choreograph two beats: the first half stays with the start state (small motion only); the second half slides and morphs element-by-element into the end state.",
  "Elements from the start slide away one by one; elements of the end slide in one by one. The character keeps roughly the same screen position and scale.",
].join(" ");
