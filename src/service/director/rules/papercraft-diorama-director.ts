// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { papercraftDioramaDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
} from "@/service/style/realistic-light";

const PAPERCRAFT_DUAL_KEYFRAME_MOTION_RULES = [
  "Both START (State A) and END (State B) storyboard images for this clip are attached as first/last frames to MiniMax H3. Never call those stills a reference image.",
  "LENGTH & FOCUS (STRICT): write a short, focused visual-only prompt (350–800 characters, max 1,000 characters). Do NOT write voice locks, narrator/audio/SFX rules, wardrobe essays, lighting descriptions, or long negative lists.",
  "CAMERA & CHARACTER (1 short clause): keep the diorama camera steady on the cardstock set matching both frames (no jump cut); if a 3D cardstock miniature character figurine is present, keep their lips softly closed (zero lip-sync) with eyes and hands on the cardstock props.",
  "ELEMENT MOTION (State A -> State B): across the FULL duration, simply describe element-by-element how each 3D folded cardstock prop, mechanism, label, and optional figurine hand/gaze smoothly transitions from its START frame state to its END frame state with natural continuous ease-in-out motion (receipt ribbon feeding smoothly, embossed coins sliding into an envelope, box lid sliding open, or balance scale tipping and settling — rigid 300gsm cardstock pieces never morph, melt, or dissolve).",
].join(" ");

export const papercraftDioramaDirectorRules: DirectorRuleModule = {
  slug: "papercraft-diorama-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    const characterPart = options.hasCharacter
      ? "1) Character (silent 3D folded/layered matte cardstock miniature figurine matching the attached blueprint — pose, expression with lips softly closed and zero lip-sync, eyeline, and hands interacting with the cardstock props)"
      : "1) Character (none — pure 3D cardstock diorama)";
    return [
      `Scene detail: write every explainerScene (and startScene / endScene) as four concrete parts: ${characterPart}, 2) Set (miniature cardstock set and mechanisms from the topic, filling 100% of the frame edge-to-edge with no top/bottom padding bands), 3) Light (soft tabletop studio lighting), 4) Camera (macro angle and vertical/horizontal composition matching the aspect ratio).`,
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "motionCamera describes the physical papercraft mechanism smoothly animating from State A (startScene) to State B (endScene) across timed beats.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "startScene is State A (t=0 miniature cardstock still) and endScene is State B (t=N landed cardstock state) on the exact same locked diorama camera and set. Keep cardstock geometry rigid across the clip.";
  },
  phaseADirectorBlock(options) {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS): Stage the miniature cardstock sets around the user's source topic without unrelated filler objects.",
      papercraftDioramaDirectorBlock({
        hasCharacter: options.hasCharacter,
        aspectRatio: options.aspectRatio,
      }),
    ].join(" ");
  },
  phaseBMotionRules() {
    return PAPERCRAFT_DUAL_KEYFRAME_MOTION_RULES;
  },
  phaseBDetailRules() {
    return "Detail: first state the steady diorama camera and silent character (if present) in one short clause, then list element-by-element across timed beats (e.g. 0.0–2.0s …; 2.0–4.0s …) how each cardstock prop, mechanism, label, and optional figurine hand/gaze smoothly move from the Start frame to the End frame. Keep lips closed with no lip-sync, and never re-describe character appearance, outfit, lighting, or spoken voiceover.";
  },
};
