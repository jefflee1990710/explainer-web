import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import {
  DEFAULT_PAPER_CUTOUT_BACKGROUND_ID,
  resolvePaperCutoutBackground,
} from "@/model/paper-cutout-backgrounds";

/** Paper-cutout collage explainer — sibling of the whiteboard concept explainer. */
export const PAPER_CUTOUT_EXPLAINER_SKILL_SLUG = "paper-cutout-explainer-video-director";

export type ExplainerCanvasKind = "whiteboard" | "paper-cutout";

/** Dual-beat diagram explainers that share narrator / graph / action machinery. */
export function isDiagramExplainerSkill(skillSlug?: string) {
  return (
    skillSlug === CARTOON_EXPLAINER_SKILL_SLUG ||
    skillSlug === PAPER_CUTOUT_EXPLAINER_SKILL_SLUG
  );
}

export function explainerCanvasKind(skillSlug?: string): ExplainerCanvasKind | null {
  if (skillSlug === PAPER_CUTOUT_EXPLAINER_SKILL_SLUG) return "paper-cutout";
  if (skillSlug === CARTOON_EXPLAINER_SKILL_SLUG) return "whiteboard";
  return null;
}

export const WHITEBOARD_CANVAS_SET_ID = "whiteboard-canvas";
export const PAPER_CUTOUT_CANVAS_SET_ID = "paper-cutout-canvas";

export type PaperCutoutSurfaceOptions = {
  backgroundId?: string;
  customBackground?: boolean;
};

/** Resolve the full-bleed collage background lock for the chosen preset or uploaded reference image. */
export function paperCutoutCanvasLock(options?: PaperCutoutSurfaceOptions): string {
  if (options?.customBackground) {
    return "Paper-cutout collage lock (every style): flat craft collage mounted directly on the attached background reference image surface (never invent a different room, studio, or easel). The attached background reference image IS the background: it fills 100% of the frame edge-to-edge — never show outer board edges, corners, frame, thickness, wall, or white margin, and never a shadow cast by the background plate itself. Camera looks square-on (perpendicular) at the flat background surface with even overhead light; the background never tilts in perspective. Every person, product, icon, and diagram piece is a separate paper cutout with a thick irregular white scissor border: high-contrast black-and-white or kraft background cutouts, full-colour hero character and key pieces, soft drop shadows cast only by the cutouts onto the background surface.";
  }
  const preset = resolvePaperCutoutBackground(
    options?.backgroundId ?? DEFAULT_PAPER_CUTOUT_BACKGROUND_ID,
  );
  if (preset.id === "wood-cardboard") {
    return "Paper-cutout collage lock (every style): flat craft collage on a single consistent dark warm-brown vertically-grained wooden craft board (never a gridded cutting mat, never floor tiles, felt, plain black paper, 3D room, studio, sky, or easel). The wooden board IS the background: wood grain fills 100% of the frame edge-to-edge — never show the board's edges, corners, frame, thickness, wall, table, or white margin, and never a shadow cast by the board itself. Camera looks square-on (perpendicular) at the flat board with even overhead light; the board never tilts in perspective. Every person, product, icon, and diagram piece is a separate paper cutout with a thick irregular white scissor border: high-contrast black-and-white or kraft background cutouts, full-colour hero character and key pieces, soft drop shadows cast only by the cutouts onto the wood grain.";
  }
  return `Paper-cutout collage lock (every style): flat craft collage on a single consistent ${preset.surfacePrompt} (${preset.forbidSurfaces}). The ${preset.surfaceNoun} IS the background: its surface texture fills 100% of the frame edge-to-edge — never show outer edges, corners, frame, thickness, wall, or white margin, and never a shadow cast by the ${preset.surfaceNoun} itself. Camera looks square-on (perpendicular) at the flat ${preset.surfaceNoun} with even overhead light; the surface never tilts in perspective. Every person, product, icon, and diagram piece is a separate paper cutout with a thick irregular white scissor border: high-contrast black-and-white or kraft background cutouts, full-colour hero character and key pieces, soft drop shadows cast only by the cutouts onto the ${preset.surfaceNoun}.`;
}

/** Resolve the Phase A camera & light lock for the chosen paper-cutout background surface. */
export function paperCutoutCameraRule(options?: PaperCutoutSurfaceOptions): string {
  const surfaceNoun = options?.customBackground
    ? "collage background surface"
    : resolvePaperCutoutBackground(options?.backgroundId ?? DEFAULT_PAPER_CUTOUT_BACKGROUND_ID)
        .surfaceNoun;
  return `Paper-cutout camera & light lock (every clip, overrides any angle wording elsewhere): every Camera line looks square-on (perpendicular, flat top-down or straight-on frontal) at the ${surfaceNoun} — never a three-quarter, side, oblique, low, high, dutch, or orbit angle that tilts the board into perspective. Vary clips only by shot size and which part of the board is framed (wide, medium, close-up, pan across the board, push-in or pull-out). Every Light line is even, soft, diffused overhead light on the board — never side-light, raking light, or a spotlight that turns the board into a lit object in a room.`;
}

/** Resolve the Phase B video canvas line for the chosen paper-cutout background surface. */
export function paperCutoutVideoCanvasLock(options?: PaperCutoutSurfaceOptions): string {
  if (options?.customBackground) {
    return "Keep the whole canvas edge-to-edge as a paper-cutout craft collage on the attached background reference surface: thick irregular white scissor borders on every piece, colour hero on mono/kraft background cutouts, rigid paste motion (no morphing).";
  }
  const preset = resolvePaperCutoutBackground(
    options?.backgroundId ?? DEFAULT_PAPER_CUTOUT_BACKGROUND_ID,
  );
  return `Keep the whole canvas edge-to-edge as a paper-cutout craft collage on a ${preset.surfacePrompt}: thick irregular white scissor borders on every piece, colour hero on mono/kraft background cutouts, rigid paste motion (no morphing).`;
}

/** Full-bleed craft-board collage lock (default wood-cardboard constant). */
export const PAPER_CUTOUT_CANVAS_LOCK = paperCutoutCanvasLock();

/** Phase A camera / light lock: the board is a flat background plate, so framing changes but the angle never does. */
export const PAPER_CUTOUT_CAMERA_RULE = paperCutoutCameraRule();

export const WHITEBOARD_CANVAS_LOCK =
  "Whiteboard 2D canvas lock (every style): the whole frame edge-to-edge is like a flat 2D whiteboard surface (no 3D room, studio, easel, or letterbox bars), the character on the whiteboard is in 2D, and the concept is explained with 2D drawings.";
