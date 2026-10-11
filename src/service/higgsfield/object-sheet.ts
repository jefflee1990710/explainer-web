import type { BackgroundPlate, ObjectSheetItem, Project } from "@/model/project";
import type { RenderableStyle } from "@/service/style/renderable-style";
import { styleLinesForBlueprint } from "@/service/style/prompts";

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
  return [
    "Prop reference sheet on a plain white background.",
    "Lay every listed prop out as its own tile in one row or a neat grid. Even light, no cast shadow, no lifestyle scene.",
    "Each tile shows one clear three-quarter view of that prop only. Keep materials, colours, and proportions readable.",
    "No people, no hands, no room, no captions, no watermark, no subtitle lettering.",
    ...styleLinesForBlueprint(input.style),
    "Props:",
    tiles,
  ].join("\n");
}

// Empty location plate: architecture and light only, no cast and no handheld props.
export function buildBackgroundPlatePrompt(input: {
  style: RenderableStyle;
  plate: Pick<BackgroundPlate, "name" | "notes">;
  aspectRatio: Project["aspectRatio"];
}) {
  const notes = input.plate.notes.replace(/\s+/g, " ").trim().slice(0, 240);
  return [
    `Empty set reference still for a ${input.style.name} short video.`,
    `Aspect ratio ${input.aspectRatio}.`,
    ...styleLinesForBlueprint(input.style),
    `Location: ${input.plate.name}.`,
    notes ? `Set and light: ${notes}` : "",
    "No people, no characters, no handheld props, no product close-ups, no captions, no watermark.",
    "Show only the place: architecture, set dressing that stays put, sky, and light direction.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function objectSheetLockParagraph(imageIndex: number, items: ObjectSheetItem[]) {
  if (imageIndex <= 0) return "";
  const names = items.map((item) => item.name).filter(Boolean).join(", ");
  return [
    `OBJECT LOCK: attached image ${imageIndex} is this video's prop sheet${names ? ` (${names})` : ""}.`,
    "Copy only shape, materials, and colours of props the Scene names.",
    "Do not copy the white background, the grid, or unused tiles. Do not stage a contact sheet in the scene.",
  ].join(" ");
}

export function backgroundPlateLockParagraph(imageIndex: number, plate?: Pick<BackgroundPlate, "name">) {
  if (imageIndex <= 0) return "";
  const label = plate?.name ? ` (${plate.name})` : "";
  return [
    `BACKGROUND LOCK: attached image ${imageIndex} is the empty set for this clip${label}.`,
    "Match location, architecture, sky, and light direction.",
    "Where people and props sit follows the Scene, not this plate's crop. Do not paste the empty framing.",
  ].join(" ");
}

export function objectSheetUrl(project: Pick<Project, "objectSheetUrl" | "objectSheetItems">) {
  return project.objectSheetUrl && (project.objectSheetItems?.length || 0) > 0
    ? project.objectSheetUrl
    : undefined;
}

export function backgroundPlateForClip(
  project: Pick<Project, "backgroundPlates" | "phaseA">,
  clipNumber: number,
) {
  const setId = project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber)?.backgroundSetId;
  if (!setId) return undefined;
  const plate = (project.backgroundPlates || []).find((item) => item.setId === setId);
  return plate?.url ? plate : undefined;
}
