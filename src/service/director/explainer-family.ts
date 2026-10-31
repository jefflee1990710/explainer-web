import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";

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

/** Full-bleed craft-board collage lock (matches the paper-cutout explainer reference look). */
export const PAPER_CUTOUT_CANVAS_LOCK =
  "Paper-cutout collage lock (every style): the whole frame edge-to-edge is a flat craft collage on a single consistent dark warm-brown vertically-grained wooden craft board (identical dark wood-grain tabletop surface in every clip — never a gridded cutting mat, never floor tiles, never felt or plain black paper, and never a 3D room, studio, sky, or easel). The wooden board IS the background: its wood grain fills 100% of the frame and runs past all four frame edges — never show the board's edges, corners, frame, or thickness, never a wall, table, floor, or white margin around it, and never a shadow cast by the board itself. The camera looks square-on (perpendicular) at the flat board with even, soft overhead light; the board never tilts, recedes in perspective, or stands as an object in a room. Every person, product, icon, building, cloud, and diagram piece is a separate paper cutout with a thick irregular white scissor border (hand-cut magazine / photo edge). Background cutouts stay high-contrast black-and-white or kraft; the hero character / product / concept pieces stay in full colour. Only the cutouts cast soft drop shadows, directly onto the wood grain, with slight stop-motion jitter.";

/** Phase A camera / light lock: the board is a flat background plate, so framing changes but the angle never does. */
export const PAPER_CUTOUT_CAMERA_RULE =
  "Paper-cutout camera & light lock (every clip, overrides any angle wording elsewhere): every Camera line looks square-on (perpendicular, flat top-down or straight-on frontal) at the wooden craft board — never a three-quarter, side, oblique, low, high, dutch, or orbit angle that tilts the board into perspective. Vary clips only by shot size and which part of the board is framed (wide, medium, close-up, pan across the board, push-in or pull-out). Every Light line is even, soft, diffused overhead light on the board — never side-light, raking light, or a spotlight that turns the board into a lit object in a room.";

export const WHITEBOARD_CANVAS_LOCK =
  "Whiteboard 2D canvas lock (every style): the whole frame edge-to-edge is like a flat 2D whiteboard surface (no 3D room, studio, easel, or letterbox bars), the character on the whiteboard is in 2D, and the concept is explained with 2D drawings.";
