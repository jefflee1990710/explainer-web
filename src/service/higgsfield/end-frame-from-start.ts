import { generateText } from "ai";
import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { isDiagramExplainerSkill } from "@/service/director/explainer-family";
import { endSceneModel } from "@/service/director/model";
import type { FramePosition } from "@/model/project";

// Seedream follows a short landed-state prompt. The long storyboard prompt was
// getting its motion line deleted, so the end still no longer matched the start.
export const END_FRAME_PROMPT_MAX = 900;

// Diagram end stills are the only frames that should be rewritten from the
// opening pixels plus motionCamera. A chat edit or a hand redo keeps its prompt.
export function diagramEndFrameUsesStartMotion(input: {
  skillSlug?: string;
  position: FramePosition;
  promptEdited?: boolean;
  startImageUrl?: string;
  hasRevision?: boolean;
}) {
  return (
    input.position === "end" &&
    isDiagramExplainerSkill(input.skillSlug) &&
    !input.promptEdited &&
    !input.hasRevision &&
    Boolean(input.startImageUrl)
  );
}

export function endFrameFromStartSystem(maxChars = END_FRAME_PROMPT_MAX) {
  return [
    "You write the image prompt for one explainer END still.",
    "The attached image is this clip's START still (State A).",
    "motionCamera (and optional endScene) describes the landed State B.",
    `Write one image prompt of at most ${maxChars} characters.`,
    "Describe only the landed picture, after the motion has finished. Do not narrate the path, timestamps, or words like then / first / next.",
    "Keep the attached START image's exact camera, framing/crop (never zoom out to reveal lower body or shoes absent in the START still), background surface (never add an extra white paper sheet or board over the background if the START still has none), axes, grid, title-plate position, and presenter corner.",
    "Keep unchanged 「」 labels from the START still in their exact position and wording; change or add 「」 labels only when endScene or motionCamera explicitly specifies a new or updated label.",
    "Copy every 「」 label that is visible at the end, glyph for glyph. Do not invent axis titles or extra captions.",
    "Return only the prompt. No commentary and no code fence.",
  ].join(" ");
}

export function endFrameFromStartUserText(input: {
  motionCamera: string;
  aspectRatio: string;
  language?: string;
  endScene?: string;
}) {
  const script =
    input.language === "zh-Hant"
      ? "On-screen words are Traditional Chinese 書面語."
      : input.language === "zh-Hans"
        ? "On-screen words are Simplified Chinese."
        : "";
  return [
    input.endScene?.trim() ? `endScene:\n${input.endScene.trim()}` : "",
    `motionCamera:\n${input.motionCamera.trim()}`,
    script,
    `Aspect ratio ${input.aspectRatio}.`,
    `Write the end-still prompt in at most ${END_FRAME_PROMPT_MAX} characters.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function unwrapModelText(text: string) {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:\w+)?\s*\n([\s\S]*?)\n```$/);
  return (fence ? fence[1] : trimmed).trim();
}

// Stay inside the cap. An open 「」 that would be sliced in half is dropped.
export function fitEndFramePrompt(text: string, max = END_FRAME_PROMPT_MAX) {
  const unwrapped = unwrapModelText(text);
  if (unwrapped.length <= max) return unwrapped;
  let cut = max;
  const open = unwrapped.lastIndexOf("「", max);
  const close = unwrapped.lastIndexOf("」", max - 1);
  if (open !== -1 && open > close) cut = open;
  const head = unwrapped.slice(0, cut).trimEnd();
  const sentence = Math.max(head.lastIndexOf("。"), head.lastIndexOf("\n"), head.lastIndexOf(". "));
  const clipped = sentence > Math.floor(max * 0.6) ? head.slice(0, sentence + 1) : head;
  return clipped.trim();
}

type GenerateEndPrompt = (input: {
  system: string;
  userText: string;
  image: Uint8Array;
}) => Promise<string>;

async function loadStartImage(url: string) {
  const [part] = await loadDirectorImageParts([url]);
  if (!part) throw new Error("無法讀取起點圖");
  return part.image;
}

async function generateEndFramePrompt(input: {
  system: string;
  userText: string;
  image: Uint8Array;
}) {
  const { text } = await generateText({
    model: endSceneModel(),
    system: input.system,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: input.userText },
          { type: "file", data: input.image, mediaType: "image/jpeg" },
        ],
      },
    ],
  });
  return text;
}

// Step 1 of the end still: start image + motionCamera → a short prompt.
// Step 2 is the existing image submit, which still attaches that start image.
export async function writeEndFramePromptFromStart(
  input: {
    startImageUrl: string;
    motionCamera: string;
    aspectRatio: string;
    language?: string;
    endScene?: string;
  },
  deps?: {
    loadImage?: (url: string) => Promise<Uint8Array>;
    generate?: GenerateEndPrompt;
  },
) {
  const loadImage = deps?.loadImage ?? loadStartImage;
  const generate = deps?.generate ?? generateEndFramePrompt;
  const image = await loadImage(input.startImageUrl);
  const text = await generate({
    system: endFrameFromStartSystem(),
    userText: endFrameFromStartUserText(input),
    image,
  });
  const fitted = fitEndFramePrompt(text);
  if (fitted.length < 40) throw new Error("終點圖提示詞太短");
  return fitted;
}
