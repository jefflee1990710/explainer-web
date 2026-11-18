// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { PAPERCRAFT_TEXT_LAYOUT, papercraftDioramaDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
} from "@/service/style/realistic-light";

const PAPERCRAFT_START_STILL_MOTION_RULES = [
  "Only the START still (State A) is attached as the first frame. There is no end image and no last frame. endScene is the written State B landing the motion reaches. Never call the start still a reference image.",
  "LENGTH & FOCUS (STRICT): write a short, focused visual-only prompt (350–800 characters, max 1,000 characters). Do NOT write voice locks, narrator/audio/SFX rules, wardrobe essays, lighting descriptions, or long negative lists.",
  "CAMERA & CHARACTER (1 short clause): keep the diorama camera steady on the cardstock set (no jump cut); if a 3D cardstock miniature character figurine is present, keep their lips softly closed (zero lip-sync) with eyes and hands on the cardstock props. On a standing shot both feet stay planted on the floor for the whole clip; do not lift or float the figurine. A 90-degree overhead flat-lay keeps the figurine flat on the sheet.",
  "ELEMENT MOTION (State A -> written State B): FAST PACING. Follow motionCamera beat by beat, but play every cardstock prop, mechanism, label, and figurine hand quickly from the attached start still toward the written endScene — each move finishes in under 0.6 seconds (ribbon feeds fast, coins slide in fast, lid snaps open, scale tips and settles fast), then the next beat starts at once. Do not stretch one glide across the full clip, and do not write slow, gentle, gradual, or ease-in-out. Feet stay planted. Rigid 300gsm pieces never morph, melt, or dissolve. Keep every prop and label fully inside the frame; a tipping scale must not swing a pan or label off the left or right edge.",
].join(" ");

export const papercraftDioramaDirectorRules: DirectorRuleModule = {
  slug: "papercraft-diorama-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    const characterPart = options.hasCharacter
      ? "1) Character (silent 3D folded/layered matte cardstock miniature figurine matching the attached blueprint — pose, expression with lips softly closed and zero lip-sync, eyeline, and hands interacting with the cardstock props; on every camera except flat-lay-top-down, both feet stand on a visible cardstock floor the set shares, never floating in the backdrop; on flat-lay-top-down the figurine lies flat on the sheet)"
      : "1) Character (none — pure 3D cardstock diorama)";
    return [
      `Scene detail: write every explainerScene (and startScene / endScene) as four concrete parts: ${characterPart}, 2) Set (miniature cardstock set and mechanisms from the topic, filling 100% of the frame edge-to-edge with no top/bottom padding bands), 3) Light (soft tabletop studio lighting), 4) Camera (macro angle and vertical/horizontal composition matching the aspect ratio).`,
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "motionCamera describes the physical papercraft mechanism animating from the start still (startScene) toward the written landing (endScene) in short fast beats (e.g. 0.0–0.6s …; 0.6–1.2s …). Each move finishes in under 0.6 seconds. Do not write a slow glide. endScene is not a generated still.",
      "On-canvas explanation: the unseen narrator speaks briskly and is never pasted as a full paragraph onto the set. Clip 1 shows exactly ONE on-screen text, the BIG, BOLD HOOK TITLE (4–8 English words / 6–12 CJK characters), and no other captions, so the viewer focuses on that title; one hero prop is enough. Clips 2+ may show more props: ONE explanatory 「」 headline (4–8 English words / 6–12 CJK characters) plus 2–3 short cardstock captions inside 「」 (3–6 words / 4–8 CJK characters) that explain each prop. Clip 1's hook title is always horizontally centered and sits on the vertical center, shifted slightly upward; hold that spot for the first 3 seconds and never pin it to the top edge. In-frame lock: every cardstock prop, 「」 label, pan, and the character stays fully inside the frame. Never crop a sign, pan, hand, or head off any edge. On 9:16, shrink a wide mechanism such as a balance scale until both pans and both labels fit; the background sheet still fills the frame. Lips stay closed.",
      PAPERCRAFT_TEXT_LAYOUT,
      "In every startScene, write that center placement (for example 畫面中央，標題與標籤聚在主體四周). Never write 上方, 頂部, a top banner, or tape on the frame corners.",
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
    return "Detail: first state the steady diorama camera and silent character (if present) in one short clause, then list element-by-element across short fast beats (e.g. 0.0–0.6s …; 0.6–1.2s …) how each cardstock prop, mechanism, label, and optional figurine hand/gaze move from the attached start still toward the written endScene. Each move finishes in under 0.6 seconds. Keep lips closed with no lip-sync, and never re-describe character appearance, outfit, lighting, or spoken voiceover.";
  },
};
