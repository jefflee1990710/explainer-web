// Shared MiniMax H3 dual-keyframe motion contract. Start and end stills are
// the same shot; the clip must keep moving across the full duration, with
// human timing rather than one constant-speed glide.

export const DUAL_KEYFRAME_MOTION_RULES = [
  "The start and end storyboard images for this clip are the SAME SHOT, attached as first/last frames.",
  "Never call those stills a reference image; MiniMax H3 receives them as first/last frames only.",
  "They differ by a duration-scaled amount (see the clip's durationSeconds). Something moves through the FULL duration — do not hold the start pose then snap to the end in the last frames.",
  "Give body motion real human timing, not one constant speed: a quick anticipation, then the main move snaps fast and decisive in well under a second, a small overshoot, then a clear settle and a short hold while props and the graph keep animating. When a character is on screen, animate vivid, expressive facial expression changes (active eyebrows, expressive eyes, and clear emotional reactions) through the beats—never a blank or deadpan face.",
  "Put a timestamp on each beat and write the speed into the verbs (snaps, flicks, whips, pops, darts). Never call the body motion smooth, slow, gentle, gradual, steady, sustained, or seamless, and never stretch one move evenly across the whole clip.",
  "Use the seconds: short clips (3–4s) are one beat; longer clips (5–8s) are two beats that finish on the end still.",
  "Interpolate element-by-element: start elements leave one by one; end elements pop or slide in. The character keeps roughly the same screen position and scale.",
].join(" ");

// Cinematic realistic whiteboard: one start image plus the motion. endScene is text
// for the landing, not a picture the video model receives. The move accelerates
// through the change, then decelerates, while on-screen whiteboard graphics animate briskly.
export const DUAL_KEYFRAME_GLIDE_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the motion. endScene is where this clip's one action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "CAMERA LOCK (NO ZOOM-IN / NO PUSH-IN): keep the camera 100% locked and stationary square-on to the board for the entire clip — NEVER zoom in, push in, pull out, or pan the camera.",
  "FAST, ACCELERATED, TIGHT PACING (NO SLOW MOTION): the move starts, accelerates through the change, then decelerates into the landing at a brisk, accelerated, high-energy pace (1.3x–1.5x snappy stop-motion / kinetic explainer speed) with zero sluggish glides and zero dead holds. Pack the clip with rapid-fire visual beats every 1.0–1.5 seconds (0.0–1.2s, 1.2–2.5s, 2.5–4.0s, 4.0–end): elements whip/slide in and out at high speed (快速滑入／滑出), folded paper cards snap and unfold flat in under 0.5s (快速摺開), top cover strips tear or peel away briskly to reveal the card underneath (快速撕開), connecting arrows/lines/circles draw themselves rapidly stroke-by-stroke across the board (快速畫出), two-sided cards flip briskly through their edge (快速翻轉), and takeaway badges stamp down with crisp impact while the character briskly points their hand and gaze from Focus Point 1 → Focus Point 2 → Focus Point 3.",
  "Use at most ONE directional arrow per clip (never stack multiple arrows or spawn extra flying arrows if one is already on screen), and never slide blank grey slash strips or masking-tape stickers over headers.",
  "Whiteboard cardboard physics: every prop, card, diagram block, arrow, chart bar, shape, and tag moves as a single rigid flat cardboard/paper cutout piece in one piece. Elements slide briskly in and out of the screen, unfold, tear open, or snap into place without bending, melting, dissolving, or morphing into another shape. Background and set layers stay 100% stationary and rigid.",
  "Write high-velocity speed into every verb (whips in, snaps open, tears away briskly, zips across, flips rapidly, stamps down, points sharply). Never use slow, gentle, gradual, or leisurely verbs, and never leave the character or diagram holding still. Never skip a frame and never cut.",
  "The character stays in their presenter corner keeping the same screen position and scale while pointing briskly at each active focus point.",
].join(" ");

// Cinematic realistic live-action (non-whiteboard skills): one start image plus natural human/camera motion.
export const REALISTIC_SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with one clean continuous shot per beat and no repeats (never flash the same object or action twice).",
  "Play body and object motion with authentic live-action physics and natural human timing: genuine weight transfer, full-body locomotion when the scene calls for running, walking, or striding, natural inertia, subtle breathing lifting the chest and shoulders, natural blinks and ocular micro-saccades, real cloth drape, and vivid, expressive facial acting synced to the beat.",
  "Never use whiteboard cardboard cutout physics or cartoon snap/whip verbs for realistic people and sets. Background architecture and set dressing stay physically grounded and never warp or morph.",
  "Follow the camera movement described in motionCamera (such as a smooth gimbal tracking shot, follow shot, pan, or steady framing) with natural optical depth of field. Layer diegetic environmental sound effects matched to each physical action in the beats.",
].join(" ");
