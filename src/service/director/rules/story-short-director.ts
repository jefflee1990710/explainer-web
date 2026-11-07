// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SIGHTLINE_RULE =
  "Sightline: show only what this camera can see. A working face (a person's face, a screen, a page, a sign, a dial, a label) stays aimed at whoever uses it. Draw that content only on that side. If this camera cannot see that side, draw the blank side it does see. Never turn a person or a prop around, and never move the content onto the blank side, just to make it visible.";

const STORY_DUAL_KEYFRAME_MOTION_RULES = [
  "The start and end storyboard images for this clip are the SAME SHOT, attached as first/last frames.",
  "Never call those stills a reference image; MiniMax H3 receives them as first/last frames only.",
  "They differ by a duration-scaled amount (see the clip's durationSeconds). Something moves through the FULL duration — do not hold the start pose then snap to the end in the last frames.",
  "Give body motion real human timing, not one constant speed: a quick anticipation, then the main move snaps fast and decisive in well under a second, a small overshoot, then a clear settle and a short hold while props and the graph keep animating. When a character is on screen, animate vivid, expressive facial expression changes (active eyebrows, expressive eyes, and clear emotional reactions) through the beats—never a blank or deadpan face.",
  "Put a timestamp on each beat and write the speed into the verbs (snaps, flicks, whips, pops, darts). Never call the body motion smooth, slow, gentle, gradual, steady, sustained, or seamless, and never stretch one move evenly across the whole clip.",
  "Use the seconds: short clips (3–4s) are one beat; longer clips (5–8s) are two beats that finish on the end still.",
  "Interpolate element-by-element: start elements leave one by one; end elements pop or slide in. The character keeps roughly the same screen position and scale.",
].join(" ");
const STORY_SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with one clean continuous shot per beat and no repeats (never flash the same object or action twice).",
  "Play body and object motion with authentic live-action physics and natural human timing: genuine weight transfer, full-body locomotion when the scene calls for running, walking, or striding, natural inertia, subtle breathing lifting the chest and shoulders, natural blinks and ocular micro-saccades, real cloth drape, and vivid, expressive facial acting synced to the beat.",
  "Never use whiteboard cardboard cutout physics or cartoon snap/whip verbs for realistic people and sets. Background architecture and set dressing stay physically grounded and never warp or morph.",
  "Follow the camera movement described in motionCamera (such as a smooth gimbal tracking shot, follow shot, pan, or steady framing) with natural optical depth of field. Layer diegetic environmental sound effects matched to each physical action in the beats.",
].join(" ");

export const storyShortDirectorRules: DirectorRuleModule = {
  slug: "story-short-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts, in this order:",
      options.realistic
        ? "1) Character: expression, pose, physical action, and eyeline of each on-screen character — whenever a character is present, give them a calm, relaxed, unforced real-person facial expression matching the emotional beat (attentive focused eyes; lips softly closed when silent, or natural restrained lip-sync only when speaking dialogue; never a blank or deadpan stare; never exaggerated cartoon grimaces)."
        : "1) Character: expression, pose, physical action, and eyeline of each on-screen character — whenever a character is present, give them a vivid, specific facial expression matching the emotional beat (active eyebrows, expressive eyes; lips closed when silent, or speaking when delivering dialogue; never a blank or neutral face).",
      "2) Set: location, environment, foreground / midground / background from the user's source.",
      "3) Light: light direction, colour temperature, mood.",
      "4) Camera: shot size, camera angle, composition, and where each character sits in frame (left / centre / right, near / far) — cut between clips like a movie according to who is speaking (`Shot/Reverse-Shot` medium close-up on the active speaker, `Over-the-Shoulder (OTS)` past the listener's shoulder onto the speaker, `Two-Shot` when characters interact physically, or reaction close-up), maintaining strict 180-degree axis and eyeline continuity across cuts.",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      SIGHTLINE_RULE,
      "motionCamera is the continuous live-action camera and body movement script across the clip, written as timed beats (e.g. 0–2s …; 2–5s …). Each beat states: time window → who speaks or moves and how (authentic physical locomotion, gesture, or posture change; only the active speaker's mouth lip-syncs while listening characters keep their lips closed and react through eyes/brows) → the natural facial expression shift → the camera movement (tracking shot, pan, push-in, or steady framing).",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return [
      "explainerScene describes the opening still at t=0s of the clip: one clear moment of the story action in the user's setting, framed on the active speaker or character interaction for this cut.",
      "SPEAKER-DRIVEN MOVIE CUTS: Cut to a new clip whenever the speaker changes or the dramatic beat shifts (`Shot/Reverse-Shot`, `Over-the-Shoulder`, or `Two-Shot`). Maintain the 180-degree camera axis so characters keep consistent left/right screen direction and opposing eyelines across cuts.",
      "Each still shows exactly ONE instance of each named character — never two bodies of the same character in one frame.",
      "motionCamera describes the continuous physical action, speaker lip-sync, listener reaction, and camera movement that plays out from t=0s across durationSeconds. No jump cut or teleport inside a clip.",
    ].join("\n");
  },
  phaseADirectorBlock() {
    return [
      "This is a SHORT FILM driven by multi-character dialogue and movie-style scene cutting, not an explainer.",
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS, ZERO INVENTED PLOTS): Stage ONLY the exact actions, locations, and objects explicitly written in the user's source prompt. NEVER invent symbolic props, metaphors, or extra objects (e.g., never add a paper airplane, notebook, letter, coffee cup, phone, or ruined building unless the user explicitly wrote it in the source). If the user asks for a young girl running down a hill, every clip stages ONLY that exact running action down the hillside.",
      "Do not force want → obstacle → turn → resolution. Arrange clips in the order the source already tells; invent beats only when the source has no story of its own.",
      "SPEAKER-DRIVEN MOVIE EDITING (分鏡依說話者切換): Direct multi-character dialogue like a narrative film. Cut between clips based on WHO IS SPEAKING and WHO IS REACTING: alternate `Shot/Reverse-Shot` medium close-ups on the active speaker, `Over-the-Shoulder (OTS)` shots looking past the listener at the speaker, and `Two-Shots` when both characters share a physical action. Maintain strict 180-degree axis and eyeline continuity across cuts (if Character A is on the left looking frame-right at Character B in Clip 1, Character B is on the right looking frame-left at Character A in Clip 2).",
      "DURATION & PACING: Set clipCount and each clip's durationSeconds (5–12 seconds) from the dialogue lines, storytelling beats, physical action progression, or the user's explicit request — never force a silent or action clip down to 5 seconds when the action or user prompt calls for a longer 6–12s continuous shot.",
      'There is NO narrator and NO third-person off-screen voiceover. The narrator field must start with "No narrator — characters speak when needed." If the user\'s source or a scene beat is pure physical action without spoken lines, set englishVo to "(no dialogue)" and keep the character\'s lips closed. When the story or user prompt includes spoken lines, give ONE primary speaker per clip (or a tight exchange) written in englishVo as `NAME: "line"` spoken on screen by that character (with each supplied voice lock pasted verbatim), while any other on-screen character keeps their mouth closed and reacts visually.',
      "Film every clip as a third-person observer camera: characters live inside the scene and never look at or talk to the camera. Describe eyelines in explainerScene and motionCamera (profile, three-quarter, over-the-shoulder). Give every on-screen character rich, expressive facial expressions matching the emotional beat.",
    ].join(" ");
  },
  phaseBMotionRules(options) {
    return options.smoothMotion === false
      ? STORY_DUAL_KEYFRAME_MOTION_RULES
      : STORY_SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base = options.realistic
      ? "Detail: describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), each naming the physical action, a calm, relaxed, unforced real-person facial expression (natural blinks and attentive eye focus; lips softly closed on silent '(no dialogue)' beats, or restrained natural lip-sync when the character speaks dialogue; never a blank or deadpan stare; never exaggerated cartoon grimaces), and the camera movement. The lighting stays constant. Never re-describe a character's appearance or outfit; it follows the keyframe."
      : "Detail: describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), each naming the physical action, the facial expression change (expressive brows and eyes; lips closed when silent, or speaking on dialogue beats), and the camera movement. The lighting stays constant. Never re-describe a character's appearance or outfit; it follows the keyframe.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
