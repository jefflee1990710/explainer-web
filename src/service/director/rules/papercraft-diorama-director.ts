// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { papercraftDioramaDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
} from "@/service/style/realistic-light";

const PAPERCRAFT_START_STILL_MOTION_RULES = [
  "Only the START still (State A) is attached as the first frame. There is no end image and no last frame. endScene is the written State B landing the motion reaches. Never call the start still a reference image.",
  "LENGTH & FOCUS (STRICT): write a short, focused visual-only prompt (350–800 characters, max 1,000 characters). Do NOT write voice locks, narrator/audio/SFX rules, wardrobe essays, lighting descriptions, or long negative lists.",
  "CAMERA & CHARACTER (1 short clause): keep the diorama camera steady on the cardstock set (no jump cut); if a 3D cardstock miniature character figurine is present, keep their lips softly closed (zero lip-sync) with eyes and hands on the cardstock props.",
  "ELEMENT MOTION (State A -> written State B): across the FULL duration, follow motionCamera beat by beat. Describe how each 3D folded cardstock prop, mechanism, label, and optional figurine hand/gaze moves from the attached start still toward the written endScene with natural continuous ease-in-out motion (receipt ribbon feeding smoothly, embossed coins sliding into an envelope, box lid sliding open, or balance scale tipping and settling — rigid 300gsm cardstock pieces never morph, melt, or dissolve).",
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
      "motionCamera describes the physical papercraft mechanism animating from the start still (startScene) toward the written landing (endScene) across timed beats. endScene is not a generated still.",
      "On-canvas explanation: the unseen narrator speaks briskly and is never pasted as a full paragraph onto the set. Each clip shows ONE explanatory 「」 headline (6–12 English words / 10–20 CJK characters; Clip 1 uses the BIG, BOLD HOOK TITLE) plus 4–6 short cardstock captions inside 「」 (4–10 words / 8–16 CJK characters) that explain each prop. Lips stay closed.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "startScene is the opening cardstock still and endScene is the written landing on the same locked diorama camera and set. endScene is not a generated still. Keep cardstock geometry rigid across the clip.";
  },
  phaseADirectorBlock(options) {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS): Stage the miniature cardstock sets around the user's source topic without unrelated filler objects.",
      papercraftDioramaDirectorBlock({
        hasCharacter: options.hasCharacter,
        aspectRatio: options.aspectRatio,
        backgroundId: options.backgroundId,
      }),
    ].join(" ");
  },
  phaseBMotionRules() {
    return PAPERCRAFT_START_STILL_MOTION_RULES;
  },
  phaseBDetailRules() {
    return "Detail: first state the steady diorama camera and silent character (if present) in one short clause, then list element-by-element across timed beats (e.g. 0.0–2.0s …; 2.0–4.0s …) how each cardstock prop, mechanism, label, and optional figurine hand/gaze move from the attached start still toward the written endScene. Keep lips closed with no lip-sync, and never re-describe character appearance, outfit, lighting, or spoken voiceover.";
  },
};
