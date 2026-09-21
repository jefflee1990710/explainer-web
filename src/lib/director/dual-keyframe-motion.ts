// Shared Wan dual-keyframe motion contract. Start and end stills are the
// same shot; the clip must interpolate across the full duration.

export const DUAL_KEYFRAME_MOTION_RULES = [
  "The start and end storyboard images for this clip are the SAME SHOT, attached as first/last frames.",
  "Never call those stills a reference image; Wan 3.0 routes 'reference' as a different mode from first/last-frame lock.",
  "They differ by a duration-scaled amount (see the clip's durationSeconds): interpolate that travel smoothly across the FULL duration — do not hold the start pose then snap to the end in the last frames.",
  "Use the seconds: short clips (3–4s) are one beat; longer clips (5–8s) are two beats that finish on the end still.",
  "Interpolate element-by-element: start elements slide away one by one; end elements slide in. The character keeps roughly the same screen position and scale.",
].join(" ");
