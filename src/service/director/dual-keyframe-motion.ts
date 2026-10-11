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

// Cinematic realistic whiteboard: the two stills share camera and lettering, so the
// clip is one continuous glide of the single action. A photoreal model shows every snap.
export const DUAL_KEYFRAME_GLIDE_RULES = [
  "The start and end storyboard images for this clip are the SAME SHOT, attached as first/last frames.",
  "Never call those stills a reference image; the video model receives them as first/last frames only.",
  "They differ by one action only. Play that action as one continuous, smooth glide that fills the whole duration (see the clip's durationSeconds): the body, the hands, and the moved element travel through every in-between pose.",
  "Write the speed into the verbs (glides, eases, rotates through, slides). Never snap, flick, whip, pop, or dart. No anticipation jolt, no overshoot, no hold-then-jump. No cut and no skipped frame.",
  "The camera stays where both stills have it. A push-in, if the stills show one, is slow and even. No new angle.",
  "The lettering is identical in both frames and stays fixed for the whole clip. The character keeps the same screen position and scale.",
].join(" ");
