import { createHash } from "node:crypto";
import type { Project } from "@/model/project";
import {
  resolveSubtitleLook,
  subtitleLookLine,
} from "@/service/director/subtitle-look";
import {
  renderSubtitleGuideDataUrl,
  splitSubtitleGuideLines,
} from "@/service/higgsfield/subtitle-guide-image";

// Which lettering look a card is drawn in: a custom sample image, or a system look id.
export type LetteringLook =
  | { kind: "custom"; sampleUrl: string }
  | { kind: "system"; look: ReturnType<typeof resolveSubtitleLook> };

export function letteringLookFor(project: Pick<Project, "subtitleLook" | "textStyleImageUrl">): LetteringLook {
  return project.textStyleImageUrl
    ? { kind: "custom", sampleUrl: project.textStyleImageUrl }
    : { kind: "system", look: resolveSubtitleLook(project.subtitleLook) };
}

// Same words, line breaks, and look reuse one card; a change to any of them draws a new one.
export function subtitleLetteringKey(line: string, look: LetteringLook): string {
  const lookId = look.kind === "custom" ? `custom:${look.sampleUrl}` : `system:${look.look}`;
  const layout = splitSubtitleGuideLines(line).join("\n");
  return createHash("sha256").update(`${lookId}\n${layout}`).digest("hex").slice(0, 24);
}

// Text-only card prompt. Image 1 is the font-rendered spelling guide; image 2 (when sent) is the look sample.
export function subtitleLetteringPrompt(input: {
  line: string;
  look: LetteringLook;
  hasSample: boolean;
}): string {
  const lines = splitSubtitleGuideLines(input.line);
  const layout =
    lines.length === 2
      ? `two lines: line 1 "${lines[0]}", line 2 "${lines[1]}"`
      : `one line: "${lines[0] || input.line}"`;
  const lookLine =
    input.look.kind === "system"
      ? subtitleLookLine(input.look.look)
      : "Look: match the lettering sample exactly.";
  return [
    "Subtitle lettering card only. Show only the subtitle lettering, large, sharp, and phone-readable. No person, no room, no props, no logo, no extra words.",
    lookLine,
    input.hasSample
      ? "Attached image 2 is the lettering look sample. Copy its font weight, letter shapes, colours, paper or stroke treatment, texture, and edges. Do not copy the words in that sample."
      : "",
    "Attached image 1 is a plain font-rendered spelling guide. Copy its words, punctuation, and line breaks exactly, letter for letter. Do not copy its flat font, smooth boxes, or colours; restyle them in the Look.",
    `The only words are ${layout}. No typos, no doubled or missing letters, no empty strip. Never split an English word across two lines.`,
    "Plain flat light grey background around the lettering. Aspect ratio 16:9.",
  ]
    .filter(Boolean)
    .join("\n");
}

// Scene still line for the AI card plus the font guide: the card gives the look, the guide gives the spelling.
export function subtitleLetteringPromptLine(cardIndex: number, guideIndex: number, line: string): string {
  const lines = splitSubtitleGuideLines(line);
  const layout =
    lines.length === 2 ? `two lines ("${lines[0]}" / "${lines[1]}")` : `one line ("${lines[0] || line}")`;
  return `SUBTITLE LETTERING: attached image ${cardIndex} is the finished subtitle lettering look for this still; attached image ${guideIndex} is the font-rendered spelling guide, ${layout}. Paint the subtitle into the scene at the place and size the Scene's Subtitle sentence gives, in the font, strips, colours, texture, and edges of attached image ${cardIndex}. Spell every character and line break exactly as attached image ${guideIndex}; if the two images differ in any letter, attached image ${guideIndex} wins. Do not copy attached image ${guideIndex}'s flat font or boxes, do not draw a plain white caption, and do not copy either image's background.`;
}

// Render the subtitle lettering card locally via sharp SVG so subtitle characters and line breaks
// are 100% accurate without an extra AI image-generation round-trip.
export async function ensureSubtitleLetteringUrl(
  project: Pick<Project, "_id" | "subtitleLook" | "textStyleImageUrl" | "subtitleLetterings">,
  line: string,
): Promise<string | undefined> {
  try {
    const look = letteringLookFor(project);
    return await renderSubtitleGuideDataUrl({
      line,
      look: look.kind === "system" ? look.look : project.subtitleLook,
    });
  } catch (error) {
    console.error("[subtitle-lettering] local sharp SVG card failed", { projectId: project._id, error });
    return undefined;
  }
}
