import sharp from "sharp";
import type { JutsuMode, JutsuObjectEditMode, JutsuPlacementBox } from "@/model/jutsu-job";
import {
  JUTSU_CHARACTER_PREPARE_PROMPT,
  JUTSU_CHARACTER_RELIGHT_PROMPT,
  JUTSU_FRAME_RELIGHT_PROMPT,
  resolveJutsuLightText,
  withCharacterOutfitLock,
} from "@/service/jutsu/light-looks";
import { assertOpenRouterKey, OPENROUTER_BASE_URL } from "@/service/openrouter/generate";

export const OPENROUTER_JUTSU_VLM_MODEL =
  process.env.OPENROUTER_JUTSU_VLM_MODEL || "google/gemini-2.5-flash";

// Ported directly from Openjutsu's `KLEIN_UPSAMPLER` in `lib/picture.ts`.
export const JUTSU_PROMPT_UPSAMPLER_SYSTEM =
  "You are the prompt upsampler of an image-editing model. You see the reference image(s), attached in order (the first image, the second image, ...), and the user's short request. Expand it into ONE detailed, self-contained instruction: the caption the editing model receives together with the same images. Output only the instruction as one continuous English prose block, with no greetings, explanations, Markdown, JSON, coordinates, ids or angle-bracket tokens. Read a vague or conversational request as the most plausible edit of the supplied images.\n\nPick the voice by task shape. When one reference stays and gets bounded changes, write an imperative editing instruction on it (\"Remove the ...\", \"Change the ... to ...\", \"Zoom in on ...\"); a whole-image transformation opens with its scope (\"Convert the entire image into ...\", \"Apply a ... filter over the entire scene\"). When the references are drawn into a newly composed frame (combining subjects, a new scene, a garment, object or style donor), write a generation request (\"Create a photograph of ...\") that says what to take from each image, by ordinal, and what is newly generated.\n\nKeep every explicit edit, constraint, count, position, style cue and piece of wording, and decide what is left open as one concrete plan. Ground everything in what is actually visible: identify each referent unambiguously by its real appearance, never mention content that is not there, and use every image the user attached. State every end state concretely (which color, how large, which pose, which material) and give new content enough appearance to be generated. Cover the knock-on effects of the change (shadows, reflections, occlusion, perspective, scale, lighting) and say what fills a removed region. Typical length is 50 to 150 words. Output only the instruction.";

/** Call OpenRouter `/api/v1/chat/completions` with multimodal image buffers + text prompt. */
async function callOpenRouterVision(input: {
  system: string;
  imageBuffers: Buffer[];
  userText?: string;
}): Promise<string> {
  const key = assertOpenRouterKey();
  const content: Array<
    | { type: "image_url"; image_url: { url: string } }
    | { type: "text"; text: string }
  > = input.imageBuffers.map((buf) => ({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${buf.toString("base64")}`,
    },
  }));
  if (input.userText?.trim()) {
    content.push({ type: "text", text: input.userText.trim() });
  }

  const res = await fetch(`${OPENROUTER_BASE_URL}/api/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_JUTSU_VLM_MODEL,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content },
      ],
      temperature: 0.4,
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter VLM failed (${res.status})`);
  }
  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (body.choices?.[0]?.message?.content || "").trim();
}

export function buildJutsuObjectSwapPrompt(input: {
  editMode: JutsuObjectEditMode;
  target: string;
  changeTo: string;
  hasReferenceImage: boolean;
  placementBox?: JutsuPlacementBox;
}): string {
  const target = input.target.trim() || "object";
  const changeTo = input.changeTo.trim().replace(/^(?:add|insert|put)\s+/i, "");

  if (input.editMode === "remove") {
    const fill = changeTo
      ? ` so ${changeTo} shows cleanly behind it`
      : " and fill the area seamlessly with the surrounding background";
    return `Remove the ${target} from attached image 1${fill}. Keep the person, face, pose, lighting, and the rest of the scene exactly as they are.`;
  }

  if (input.editMode === "background") {
    if (input.hasReferenceImage) {
      return `Keep the main person (${target}) from attached image 1 in the exact same pose, expression, clothing, and framing, and replace the background behind them with the setting and lighting shown in attached image 2 (${changeTo || "matching its environment and atmosphere"}).`;
    }
    return `Keep the main person (${target}) from attached image 1 in the exact same pose, expression, clothing, and framing, and replace the background behind them with ${changeTo || "a clean cinematic studio environment"}.`;
  }

  if (input.editMode === "add") {
    const boxNote = input.placementBox
      ? ` inside the region around (${Math.round(input.placementBox.x * 100)}%, ${Math.round(input.placementBox.y * 100)}%) spanning ${Math.round(input.placementBox.width * 100)}% width by ${Math.round(input.placementBox.height * 100)}% height`
      : "";
    if (input.hasReferenceImage) {
      return `Add ${changeTo || "the object from attached image 2"} (${target})${boxNote} in attached image 1, matching the appearance of attached image 2 with natural perspective, contact shadows, and scene lighting. Keep everything else in attached image 1 unchanged.`;
    }
    return `Add ${changeTo || target}${boxNote} in attached image 1 (${target}) with natural perspective, contact shadows, and scene lighting. Keep everything else in attached image 1 unchanged.`;
  }

  // "change" mode (swap clothes, hair, or held object)
  if (input.hasReferenceImage) {
    return `In attached image 1, change the ${target} to match the exact garment/item shown in attached image 2${changeTo ? ` (${changeTo})` : ""}. Keep the person's exact face, identity, pose, hands, expression, and background from attached image 1.`;
  }
  return `In attached image 1, change the ${target} into ${changeTo || "a new stylish version"}. Keep the person's exact face, identity, pose, hands, expression, and background from attached image 1.`;
}

export function buildDefaultJutsuEditPrompt(input: {
  mode: JutsuMode;
  relightId?: string;
  customLightPrompt?: string;
  objectEditMode?: JutsuObjectEditMode;
  objectTarget?: string;
  objectChangeTo?: string;
  hasReferenceImage?: boolean;
  placementBox?: JutsuPlacementBox;
  characterOutfitSpec?: string;
}): string {
  const light = resolveJutsuLightText(input.relightId, input.customLightPrompt);

  if (input.mode === "relight_video") {
    return JUTSU_FRAME_RELIGHT_PROMPT.replace(
      "{look}",
      light || "Light the scene with warm golden-hour cinematic rim lighting.",
    );
  }

  if (input.mode === "object_swap") {
    return buildJutsuObjectSwapPrompt({
      editMode: input.objectEditMode ?? "change",
      target: input.objectTarget ?? "top",
      changeTo: input.objectChangeTo ?? "",
      hasReferenceImage: Boolean(input.hasReferenceImage),
      placementBox: input.placementBox,
    });
  }

  if (light) {
    return withCharacterOutfitLock(
      JUTSU_CHARACTER_RELIGHT_PROMPT.replace("{look}", light),
      input.characterOutfitSpec,
    );
  }

  return withCharacterOutfitLock(
    JUTSU_CHARACTER_PREPARE_PROMPT,
    input.characterOutfitSpec,
  );
}

/** Upsample a Jutsu frame-edit request with reference image buffers via OpenRouter VLM. */
export async function upsampleJutsuFramePrompt(input: {
  baseRequest: string;
  imageBuffers: Buffer[];
}): Promise<string> {
  if (input.imageBuffers.length === 0) return input.baseRequest;
  try {
    const resized = await Promise.all(
      input.imageBuffers.map((buf) =>
        sharp(buf).resize(768, 768, { fit: "inside" }).jpeg({ quality: 82 }).toBuffer(),
      ),
    );
    const text = await callOpenRouterVision({
      system: JUTSU_PROMPT_UPSAMPLER_SYSTEM,
      imageBuffers: resized,
      userText: input.baseRequest,
    });
    return text || input.baseRequest;
  } catch {
    return input.baseRequest;
  }
}

/**
 * Port of Openjutsu's Two-Pass Visual Describer (`from_picture_describe_flux3.api.json`) running 100% on OpenRouter:
 * - Pass 1 watches sampled frames from the source video section and extracts actions, held objects,
 *   mouth actions, facial expressions, gaze, and camera movement without the original person's looks.
 * - Pass 2 rewrites Pass 1 for the prepared character/scene picture so MiniMax Hailuo-3 reproduces
 *   the exact motion with the new character and lighting.
 */
export async function describeJutsuVideoMotion(input: {
  sampledFrameBuffers: Buffer[];
  preparedFrameBuffer?: Buffer;
  characterName?: string;
  relightText?: string;
}): Promise<string> {
  if (input.sampledFrameBuffers.length === 0) {
    return "The subject performs natural continuous movement matching the opening and closing keyframes, with expressive facial micro-acting and smooth camera motion.";
  }

  try {
    const frameThumbs = await Promise.all(
      input.sampledFrameBuffers.slice(0, 6).map((buf) =>
        sharp(buf).resize(512, 512, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer(),
      ),
    );

    // Pass 1: Extract pure motion, actions, held objects, expressions, gaze, and camera
    const rawAction = await callOpenRouterVision({
      system:
        "You are a motion-capture describer for video synthesis. Watch these sequential video frames sampled across the clip and write ONE concise paragraph (40–90 words) describing ONLY what happens chronologically: body actions, hand and arm movements, held objects, mouth movements, facial expressions, gaze direction, and camera movement. Do NOT describe the person's identity, hair, clothing, or lighting.",
      imageBuffers: frameThumbs,
    });

    if (!input.preparedFrameBuffer || !rawAction) {
      return (
        rawAction ||
        "The subject performs natural continuous motion from the start frame to the end frame, keeping consistent identity, outfit, and lighting."
      );
    }

    // Pass 2: Rewrite the action for the prepared character & setting
    const preparedThumb = await sharp(input.preparedFrameBuffer)
      .resize(640, 640, { fit: "inside" })
      .jpeg({ quality: 82 })
      .toBuffer();

    const rewritten = await callOpenRouterVision({
      system: [
        "You rewrite a motion description for a newly prepared character frame.",
        "First inspect the attached prepared image to see the character's appearance, outfit, lighting, and setting.",
        "Then rewrite the provided motion description so this exact character performs every action, expression, gaze shift, and hand movement in this setting.",
        input.characterName ? `Refer to the main character as ${input.characterName}.` : "",
        input.relightText ? `Keep the lighting consistent: ${input.relightText}` : "",
        "Output ONLY one continuous English paragraph (50–110 words) ready for video generation.",
      ]
        .filter(Boolean)
        .join(" "),
      imageBuffers: [preparedThumb],
      userText: `Source motion to rewrite:\n${rawAction}`,
    });

    return rewritten || rawAction;
  } catch {
    return "The subject performs natural continuous motion from the start frame to the end frame, keeping consistent identity, outfit, and lighting.";
  }
}
