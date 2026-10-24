import type { BackgroundPlate, ObjectSheetItem, Project } from "@/model/project";
import type { RenderableStyle } from "@/service/style/renderable-style";
import { styleLinesForBlueprint } from "@/service/style/prompts";
import {
  fitReferencePrompt,
  isRealisticStyle,
  REALISTIC_PROP_RENDER_RULE,
  REALISTIC_SET_RENDER_RULE,
} from "@/service/style/realistic-light";

const MAX_OBJECT_NOTES = 120;

// White contact sheet of invented props. Follows the video style (unlike product sheets).
export function buildObjectSheetPrompt(input: {
  style: RenderableStyle;
  items: ObjectSheetItem[];
}) {
  const tiles = input.items
    .map((item, index) => {
      const notes = item.notes.replace(/\s+/g, " ").trim().slice(0, MAX_OBJECT_NOTES);
      return `${index + 1}) ${item.name}${notes ? `: ${notes}` : ""}`;
    })
    .join("\n");
  const realistic = isRealisticStyle(input.style);
  return fitReferencePrompt([
    "Prop reference sheet on a plain white background.",
    ...styleLinesForBlueprint(input.style),
    "Override the style canvas: plain white background. No room, no floor, no desk, no window, no lifestyle scene.",
    realistic
      ? "Lay every listed prop out as its own tile in a neat grid."
      : "Lay every listed prop out as its own tile in a neat grid. Even light, no cast shadow.",
    ...(realistic ? [REALISTIC_PROP_RENDER_RULE] : []),
    "Each tile shows one clear three-quarter view of that prop only. Keep materials, colours, and proportions readable.",
    "Under each prop, paint its exact name in plain black sans letters. Every listed prop must appear. Do not invent extra props.",
    "No people, no hands, no watermark, no subtitle lettering.",
    "Props:",
    tiles,
  ]);
}

// Empty location plate: architecture and light only, no cast and no handheld props.
export function buildBackgroundPlatePrompt(input: {
  style: RenderableStyle;
  plate: Pick<BackgroundPlate, "name" | "notes"> & { setId?: string };
  aspectRatio: Project["aspectRatio"];
}) {
  const notes = input.plate.notes.replace(/\s+/g, " ").trim().slice(0, 240);
  const realistic = isRealisticStyle(input.style);
  const isWhiteboardCanvas =
    input.plate.setId === "whiteboard-canvas" ||
    /whiteboard|2D.*白板|白板畫布/i.test(`${input.plate.name} ${notes}`);
  if (isWhiteboardCanvas) {
    return fitReferencePrompt([
      "Empty flat 2D whiteboard surface reference plate, full-bleed edge-to-edge.",
      `Aspect ratio ${input.aspectRatio || "9:16"}.`,
      "A clean, flat, evenly illuminated pure off-white 2D whiteboard canvas surface filling 100% of the frame edge-to-edge.",
      "No 3D room, no studio, no house, no buildings, no sky, no physical easel, no borders, no grid, no people, no props, no text.",
    ]);
  }
  const isPaperCutoutCanvas =
    input.plate.setId === "paper-cutout-canvas" ||
    /paper[- ]?cutout|craft board|cutting mat|剪紙畫布/i.test(`${input.plate.name} ${notes}`);
  if (isPaperCutoutCanvas) {
    return fitReferencePrompt([
      "Empty paper-cutout craft board reference plate, full-bleed edge-to-edge.",
      `Aspect ratio ${input.aspectRatio || "9:16"}.`,
      "A flat dark craft board or black paper collage surface filling 100% of the frame edge-to-edge, with faint cutting-mat grid lines and subtle paper grain.",
      "No 3D room, no studio, no sky, no people, no cutout props, no text, no pasted pieces.",
    ]);
  }
  return fitReferencePrompt([
    `Empty set reference as a 3x3 contact sheet of the same ${input.style.name} place.`,
    "Aspect ratio 16:9.",
    ...styleLinesForBlueprint(input.style),
    `Location: ${input.plate.name}.`,
    notes ? `Set and light: ${notes}` : "",
    "Nine cells, left to right, top to bottom: 1 wide establishing, 2 medium, 3 low angle, 4 high angle, 5 from the left, 6 from the right, 7 overhead, 8 from behind, 9 architecture detail.",
    "Same architecture, sky, and light in every cell. No people, no characters, no handheld props, no product close-ups, no captions, no watermark.",
    "Show only the place: architecture, set dressing that stays put, sky, and light direction.",
    ...(realistic ? [REALISTIC_SET_RENDER_RULE] : []),
  ].filter(Boolean));
}

export function objectSheetLockParagraph(imageIndex: number, items: ObjectSheetItem[]) {
  if (imageIndex <= 0) return "";
  const names = items.map((item) => item.name).filter(Boolean).join(", ");
  return [
    `OBJECT LOCK: attached image ${imageIndex} is this video's prop sheet${names ? ` (${names})` : ""}.`,
    "Copy only shape, materials, and colours of props the Scene names. Match each named tile; if a prop is repeated in the scene, repeat that exact tile so matching items stay identical.",
    "The sheet shows each prop from the front. Aim its working face at the person using it. If this camera cannot see that face, draw the blank back. Never move the front's content onto that blank side.",
    "Do not copy the white background, the grid, or unused tiles. Do not stage a contact sheet in the scene.",
  ].join(" ");
}

export function backgroundPlateLockParagraph(imageIndex: number, plate?: Pick<BackgroundPlate, "name">) {
  if (imageIndex <= 0) return "";
  const label = plate?.name ? ` (${plate.name})` : "";
  return [
    `BACKGROUND LOCK: attached image ${imageIndex} is the empty set for this clip${label}.`,
    "This image is a 3x3 of the empty set. Use the cell whose angle matches this Scene's Camera line.",
    "Match location, architecture, lived-in surface details, sky, and light direction.",
    "Where people and props sit follows the Scene, not this plate's crop. Expand the chosen cell's environment to fill 100% of the target frame edge-to-edge (no letterbox bars or inner box). Do not paste the empty framing or the grid.",
  ].join(" ");
}

export function objectSheetUrl(project: Pick<Project, "objectSheetUrl" | "objectSheetItems">) {
  return project.objectSheetUrl && (project.objectSheetItems?.length || 0) > 0
    ? project.objectSheetUrl
    : undefined;
}

export function isWhiteboardCanvasPlate(
  plate?: Pick<BackgroundPlate, "name" | "notes" | "setId">,
): boolean {
  if (!plate) return false;
  return (
    plate.setId === "whiteboard-canvas" ||
    /whiteboard|2D.*白板|白板畫布/i.test(`${plate.name ?? ""} ${plate.notes ?? ""}`)
  );
}

/** Flat craft-board collage set — skip 3x3 architecture attachment like whiteboard-canvas. */
export function isPaperCutoutCanvasPlate(
  plate?: Pick<BackgroundPlate, "name" | "notes" | "setId">,
): boolean {
  if (!plate) return false;
  return (
    plate.setId === "paper-cutout-canvas" ||
    /paper[- ]?cutout|craft board|cutting mat|剪紙畫布/i.test(
      `${plate.name ?? ""} ${plate.notes ?? ""}`,
    )
  );
}

export function isFlatExplainerCanvasPlate(
  plate?: Pick<BackgroundPlate, "name" | "notes" | "setId">,
): boolean {
  return isWhiteboardCanvasPlate(plate) || isPaperCutoutCanvasPlate(plate);
}

export function backgroundPlateForClip(
  project: Pick<Project, "backgroundPlates" | "phaseA">,
  clipNumber: number,
) {
  const setId = project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber)?.backgroundSetId;
  if (!setId) return undefined;
  const plate = (project.backgroundPlates || []).find((item) => item.setId === setId);
  if (!plate?.url || isFlatExplainerCanvasPlate(plate)) return undefined;
  return plate;
}
