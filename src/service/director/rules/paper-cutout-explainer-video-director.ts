// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { cartoonExplainerDirectorBlock } from "@/service/director/skill-rules";
import { keyframeDeltaDirectorBlock } from "@/service/director/keyframe-delta";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
} from "@/service/style/realistic-light";

const SIGHTLINE_RULE =
  "Sightline: show only what this camera can see. A working face (a person's face, a screen, a page, a sign, a dial, a label) stays aimed at whoever uses it. Draw that content only on that side. If this camera cannot see that side, draw the blank side it does see. Never turn a person or a prop around, and never move the content onto the blank side, just to make it visible.";

const PAPER_CUTOUT_START_STILL_MOTION_RULES = [
  "Only the START still (State A) is attached as the first frame. There is no end image and no last frame. endScene is the written State B landing the motion reaches. Never call the start still a reference image.",
  "LENGTH & FOCUS (STRICT): write a short, focused visual-only prompt (350–800 characters, max 1,000 characters). Do NOT write voice locks, narrator/audio/SFX rules, wardrobe essays, lighting descriptions, or long negative lists.",
  "CAMERA & CHARACTER (1 short clause): 100% locked stationary square-on camera (no zoom, pan, tilt, or cut); silent closed-lip character stays in their presenter corner with eyes and hands following each active element.",
  "ELEMENT MOTION (State A -> written State B): across the FULL duration, follow motionCamera beat by beat. Describe how the character's hand/gaze and each changing diagram cutout or label move from the attached start still toward the written endScene with natural continuous ease-in-out motion (glide smoothly in/out, unfold flat, peel/tear open, draw stroke-by-stroke, or flip cleanly along an edge — do not hold State A frozen and snap on the final frames, and avoid jerky speed jumps).",
  "Cutout physics & SCAFFOLD LOCK / TITLE PLATE: the chosen board, axes, grid, and unchanged 「」 labels stay locked in place without morphing or dissolving; cutout pieces stay rigid. If endScene changes a 「」 label, change it by one mid-clip in-place flip or tear.",
].join(" ");

export const paperCutoutExplainerVideoDirectorRules: DirectorRuleModule = {
  slug: "paper-cutout-explainer-video-director",
  allowsInventedProps: true,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene (and startScene / endScene when used) as four concrete parts, in this order:",
      options.realistic
        ? "1) Character: expression, pose, action, and eyeline of each on-screen character — whenever a character is present, give them a calm, relaxed, unforced real-person facial expression matching the beat (attentive focused eyes and softly closed lips at natural rest; never write a forced closed-lip smile or smirk; never a blank, deadpan, or expressionless stare; never exaggerated cartoon grimaces, wide saucer eyes, or puffed cheeks)."
        : "1) Character: expression, pose, action, and eyeline of each on-screen character — whenever a character is present, keep their lips sealed and put their eyes and hands on the element they are handling (active eyebrows and expressive eyes, never a blank or neutral face, never a talking mouth).",
      "2) Set: location, set dressing, props, foreground / midground / background.",
      "3) Light: light direction, colour temperature, mood.",
      "4) Camera: shot size, camera angle, composition, and where each character sits in frame (left / centre / right, near / far).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "Be specific (a chipped blue mug, warm side light from a window on the left), not generic (a nice room).",
      SIGHTLINE_RULE,
      "motionCamera is the transition script from the start still to the end still, written as timed beats across the clip (e.g. 0–2s …; 2–5s …).",
      options.realistic
        ? "Each beat states: time window → who or what moves → from where to where → how (picked up, set down, slid in from the frame edge, written on, wiped off) → the normal, alive facial expression shift (engaged real-person brow and eye focus when a character is present; never a blank or deadpan stare; never exaggerated cartoon faces) and the camera framing."
        : "Each beat states: time window → who or what moves → from where to where → how (picked up, set down, slid in from the frame edge, written on, wiped off) → the hands working that element, with lips sealed and no speech (vivid brow and eye focus when a character is present) and the camera framing.",
      "Every difference between the start and end still gets a beat that shows its cause on camera: pose, each hand, eyeline, expression, and every prop or label that moves, appears, disappears, or changes state.",
      "A prop that is in the end still but not in the start still is either added to the start still, or enters on camera in a beat (placed by a hand, slides in from the frame edge).",
      "A prop that is in the start still but not in the end still leaves on camera in a beat (put away, moved off frame, covered).",
      "Name each hand by the character's own left or right, and keep the same hand on the same prop from the start still through motionCamera to the end still.",
      "The start and end still of one clip share the same light and the same place. endScene is the written landing after motionCamera has finished. It is not a generated still. Its Camera line is the landed shot size, angle, and where subjects sit. If motionCamera keeps the camera locked, keep that Camera line. Write the landed picture, not the in-between path.",
      "Before returning, compare each clip's start and end still item by item: every difference appears in motionCamera, and every object motionCamera touches already exists in the start still or enters in a beat.",
      "On-canvas explanation: englishVo is spoken ONLY by the off-screen narrator, briskly, and is NEVER pasted as a full paragraph or Subtitle: onto startScene or endScene. The board still explains the beat in the configured scene-text language: ONE explanatory headline inside 「」 (6–12 English words / 10–20 CJK characters; on Clip 1 the Big Bold Hook Title cutout banner is that headline) plus 4–6 short cutout captions inside 「」 (4–10 words / 8–16 CJK characters) that say what each piece means. Stage startScene as State A (initial craft board / folded strip / low meter) and endScene as State B (landed outcome / unfolded flat card / torn-open reveal / filled meter), with motionCamera physically animating State A into State B. On every clip, including Clip 1, eyes and hands stay on the teaching element. Lips and jaw stay sealed. No lip-sync, no look into the lens, and no greeting wave.",
      "Diagram scaffold: X axis, Y axis, grid lines, chart frame, wooden board, scale beam, and pipeline housing are the same shape and the same screen position in startScene and endScene. They never slide off, shrink, or disappear. Only payload pieces move (cards, badges, curves, chains, folds, stamps). Do not invent axis titles or captions outside 「」.",
      "Title plate: one title plate stays in the same rectangle for the whole clip. Prefer the same 「」 wording in startScene and endScene. If the wording must change, motionCamera names one mid-clip in-place flip or tear (翻轉 or 撕開) after the first 3 seconds, and the plate does not fly off screen. Do not change the title in the first second.",
      "Traditional Chinese labels: when the configured on-canvas language is Traditional Chinese, every 「」 string is Traditional Chinese 書面語 (繁體字形，例如 變、體、經，never 简体 变、体、经) with no colloquial particles on the board (no 嘅、唔、喺、咗、㗎).",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock(options) {
    return keyframeDeltaDirectorBlock({
      separateStills: true,
      language: options.language,
      performance: Boolean(options.hasCharacter),
      steadyStills: options.steadyStills ?? true,
    });
  },
  phaseADirectorBlock(options) {
    return cartoonExplainerDirectorBlock({
      hasCharacter: options.hasCharacter,
      smoothMotion: options.smoothMotion ?? true,
      canvas: "paper-cutout",
      backgroundId: options.backgroundId,
      customBackground: options.customBackground,
      realistic: options.realistic,
    });
  },
  phaseBMotionRules() {
    return PAPER_CUTOUT_START_STILL_MOTION_RULES;
  },
  phaseBDetailRules() {
    return "Detail: first state the locked stationary camera in one short clause, then list element-by-element across timed beats (e.g. 0.0–2.0s …; 2.0–4.0s …) how the character's hand/gaze and each changing diagram piece or label move from the attached start still toward the written endScene. Keep lips closed with no lip-sync, and never re-describe character appearance, outfit, lighting, background texture, or spoken voiceover.";
  },
};
