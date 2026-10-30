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
  "Paper-cutout collage lock (every style): the whole frame edge-to-edge is a flat craft collage mounted on a single consistent dark warm-brown vertically-grained wooden craft board (identical dark wood-grain tabletop surface in every clip — never a gridded cutting mat, never floor tiles, never felt or plain black paper, and never a 3D room, studio, sky, or easel). Every person, product, icon, building, cloud, and diagram piece is a separate paper cutout with a thick irregular white scissor border (hand-cut magazine / photo edge). Background cutouts stay high-contrast black-and-white or kraft; the hero character / product / concept pieces stay in full colour. Layer pieces with soft drop shadows and slight stop-motion jitter directly on the dark wooden board.";

export const WHITEBOARD_CANVAS_LOCK =
  "Whiteboard 2D canvas lock (every style): the whole frame edge-to-edge is like a flat 2D whiteboard surface (no 3D room, studio, easel, or letterbox bars), the character on the whiteboard is in 2D, and the concept is explained with 2D drawings.";
