// Shared MiniMax H3 dual-keyframe motion contract. Start and end stills are
// the same shot; the clip must keep moving across the full duration, with
// human timing rather than one constant-speed glide.

export const DUAL_KEYFRAME_MOTION_RULES = [
  "The start and end storyboard images for this clip are the SAME SHOT, attached as first/last frames.",
  "Never call those stills a reference image; MiniMax H3 receives them as first/last frames only.",
  "They differ by a duration-scaled amount (see the clip's durationSeconds). Something moves through the FULL duration — do not hold the start pose then snap to the end in the last frames.",
  "Give body motion real human timing, not one constant speed: a quick anticipation, then the main move snaps fast and decisive in well under a second, a small overshoot, then a clear settle and a short hold while props and the graph keep animating.",
  "Put a timestamp on each beat and write the speed into the verbs (snaps, flicks, whips, pops, darts). Never call the body motion smooth, slow, gentle, gradual, steady, sustained, or seamless, and never stretch one move evenly across the whole clip.",
  "Use the seconds: short clips (3–4s) are one beat; longer clips (5–8s) are two beats that finish on the end still.",
  "Interpolate element-by-element: start elements leave one by one; end elements pop or slide in. The character keeps roughly the same screen position and scale.",
].join(" ");

// Cinematic realistic whiteboard: one start image plus the motion. endScene is text
// for the landing, not a picture the video model receives.
export const DUAL_KEYFRAME_GLIDE_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's one action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Play the action as one continuous, smooth glide that fills the whole duration (see the clip's durationSeconds). Show every in-between pose of the body, the hands, and the moved element.",
  "Write the speed into the verbs (glides, eases, rotates through, slides). Never snap, flick, whip, pop, or dart. No anticipation jolt, no overshoot, no hold-then-jump. No cut and no skipped frame.",
  "The camera follows motionCamera. The lettering painted on the start image stays fixed for the whole clip: no wipe and no new words. The character keeps the same screen position and scale.",
].join(" ");
