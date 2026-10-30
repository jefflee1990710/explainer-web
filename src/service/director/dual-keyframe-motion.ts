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
  "Reply with the start scene and the camera motion. endScene is where this clip's one action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Play the action across the whole duration (see the clip's durationSeconds) with fast, snappy, kinetic rhythm—never slow, sluggish, or holding still for seconds: it starts, accelerates through the change, then decelerates into the landing. The middle of the move is sharp and quick. The opening and the landing are slower. Show every in-between pose of the body, the hands, the moved element, and the character's vivid, expressive facial expression changes (active eyebrows, expressive eyes, and clear emotional shifts).",
  "Enforce a clean on-screen whiteboard explainer visual event every 1.5–2 seconds across the entire clip: flip comparison cards, pop in labeled geometric shapes, icons, and objects, and animate rising/falling bar charts, line graphs, or flow nodes in sync with the narration so the screen is never static. Use at most ONE directional arrow per clip (never stack multiple arrows or spawn extra flying arrows if one is already on screen), and never slide blank grey slash strips or masking-tape stickers over headers.",
  "Whiteboard cardboard physics: every prop, card, diagram block, arrow, chart bar, shape, and tag moves as a single rigid flat cardboard/paper cutout piece in one piece. Elements slide briskly in and out of the screen (from or to the frame edges), pop into view, or snap into place without bending, melting, dissolving, or morphing into another shape. Connecting lines and arrows draw sharply from node to node. Background and set layers stay rigid and never warp, melt, or transform.",
  "When the camera pushes in or pulls out (zooms out), use a clean multi-plane parallax zoom-out / push-in effect where rigid foreground, midground, and background cutout planes shift depth cleanly without background warping or focal-length distortion.",
  "Write that speed into the verbs (accelerates, drives through, slides in, slides out, snaps in, pops up, draws across, eases out). Do not stretch the move as one slow constant glide, and never leave the character or graph holding still for the second half of the clip. Never skip a frame and never cut. No hold-then-jump.",
  "The camera follows motionCamera. The lettering painted on the start image stays fixed for the whole clip: no wipe and no new words. The character keeps the same screen position and scale.",
].join(" ");

// Cinematic realistic live-action (non-whiteboard skills): one start image plus natural human/camera motion.
export const REALISTIC_SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with one clean continuous shot per beat and no repeats (never flash the same object or action twice).",
  "Play body and object motion with authentic live-action physics and natural human timing: genuine weight transfer, natural inertia, subtle breathing lifting the chest and shoulders, natural blinks and ocular micro-saccades, real cloth drape, and vivid, expressive facial acting synced to the beat.",
  "Never use whiteboard cardboard cutout physics or cartoon snap/whip verbs for realistic people and sets. Background architecture and set dressing stay physically grounded and never warp or morph.",
  "Camera motion follows motionCamera (smooth gimbal push/pull, slow dolly, or subtle handheld micro-drift with natural optical depth of field). Layer diegetic environmental sound effects matched to each physical action in the beats.",
].join(" ");
