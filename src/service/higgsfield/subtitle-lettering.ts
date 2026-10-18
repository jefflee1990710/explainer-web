import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { videosCollection } from "@/dao";
import type { Project, SubtitleLettering } from "@/model/project";
import {
  resolveSubtitleLook,
  subtitleLookLine,
  systemTextStylePreview,
} from "@/service/director/subtitle-look";
import {
  hasOpenRouterKey,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
import { persistBuffer, persistMedia } from "@/service/higgsfield/persist";
import {
  renderSubtitleGuideDataUrl,
  splitSubtitleGuideLines,
} from "@/service/higgsfield/subtitle-guide-image";
import { getAppUrl, isPublicHttpUrl } from "@/util/app-url";

// Which lettering look a card is drawn in: a custom sample image, or a system look id.
export type LetteringLook =
  | { kind: "custom"; sampleUrl: string }
  | { kind: "system"; look: ReturnType<typeof resolveSubtitleLook> };

export function letteringLookFor(project: Pick<Project, "subtitleLook" | "textStyleImageUrl">): LetteringLook {
  return project.textStyleImageUrl
    ? { kind: "custom", sampleUrl: project.textStyleImageUrl }
    : { kind: "system", look: resolveSubtitleLook(project.subtitleLook) };
}

// Same words + same look reuse one card; any change to either draws a new one.
export function subtitleLetteringKey(line: string, look: LetteringLook): string {
  const lookId = look.kind === "custom" ? `custom:${look.sampleUrl}` : `system:${look.look}`;
  const words = line.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(`${lookId}\n${words}`).digest("hex").slice(0, 24);
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
    `The only words are ${layout}. No typos, no doubled or missing letters, no empty strip.`,
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

// System preview PNGs live in /public. A public deploy sends the URL; local dev inlines the file.
async function systemSampleUrl(look: ReturnType<typeof resolveSubtitleLook>): Promise<string | undefined> {
  const preview = systemTextStylePreview(look);
  const absolute = `${getAppUrl()}${preview}`;
  if (isPublicHttpUrl(absolute)) return absolute;
  try {
    const file = await readFile(path.join(process.cwd(), "public", preview));
    return `data:image/png;base64,${file.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function saveLetteringImage(imageUrl: string, pathname: string): Promise<string> {
  if (imageUrl.startsWith("data:")) {
    const [meta, data] = imageUrl.split(",", 2);
    const contentType = meta.match(/^data:([^;]+)/)?.[1] || "image/png";
    return persistBuffer(Buffer.from(data || "", "base64"), pathname, contentType);
  }
  return persistMedia(imageUrl, pathname);
}

// Cached card URL for this line, or a freshly drawn one. Undefined means "use the font guide":
// no OpenRouter key, or the draw failed. The still never fails because of this card.
export async function ensureSubtitleLetteringUrl(
  project: Pick<Project, "_id" | "subtitleLook" | "textStyleImageUrl" | "subtitleLetterings">,
  line: string,
): Promise<string | undefined> {
  const look = letteringLookFor(project);
  const key = subtitleLetteringKey(line, look);
  const cached = project.subtitleLetterings?.find((item) => item.key === key);
  if (cached?.url) return cached.url;
  if (!hasOpenRouterKey()) return undefined;

  try {
    const guideUrl = await renderSubtitleGuideDataUrl({
      line,
      look: look.kind === "system" ? look.look : undefined,
    });
    const sampleUrl = look.kind === "custom" ? look.sampleUrl : await systemSampleUrl(look.look);
    const submitted = await submitOpenRouterImage({
      model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
      prompt: subtitleLetteringPrompt({ line, look, hasSample: Boolean(sampleUrl) }),
      aspectRatio: "16:9",
      resolution: "1k",
      referenceImageUrls: sampleUrl ? [guideUrl, sampleUrl] : [guideUrl],
    });
    const imageUrl = submitted.images?.[0]?.url;
    if (submitted.status !== "completed" || !imageUrl) return undefined;

    const url = await saveLetteringImage(
      imageUrl,
      `explainer/${project._id.toHexString()}/subtitle-lettering/${key}.png`,
    );
    const entry: SubtitleLettering = { key, url };
    const projects = await videosCollection();
    // Two stills of the same line can race; the first saved card wins and the blob path is shared.
    await projects.updateOne(
      { _id: project._id, "subtitleLetterings.key": { $ne: key } },
      { $push: { subtitleLetterings: entry } },
    );
    return url;
  } catch (error) {
    console.error("[subtitle-lettering] card failed, using font guide", { projectId: project._id, error });
    return undefined;
  }
}
