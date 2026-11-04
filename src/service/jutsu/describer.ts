import sharp from "sharp";
import type {
  JutsuMode,
  JutsuObjectEditMode,
  JutsuPersonMapping,
  JutsuPlacementBox,
} from "@/model/jutsu-job";
import {
  JUTSU_CHARACTER_PREPARE_PROMPT,
  JUTSU_CHARACTER_RELIGHT_PROMPT,
  JUTSU_FRAME_RELIGHT_PROMPT,
  resolveJutsuLightText,
  withCharacterOutfitLock,
} from "@/service/jutsu/light-looks";
import { assertOpenRouterKey, OPENROUTER_BASE_URL } from "@/service/openrouter/generate";

export const OPENROUTER_JUTSU_VLM_MODEL =
  process.env.OPENROUTER_JUTSU_VLM_MODEL || "qwen/qwen2.5-vl-72b-instruct";

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

function horizontalZoneLabel(box: JutsuPlacementBox): string {
  const cx = box.x + box.width / 2;
  if (cx < 0.38) return `on the left (around ${Math.round(cx * 100)}% horizontal position)`;
  if (cx > 0.62) return `on the right (around ${Math.round(cx * 100)}% horizontal position)`;
  return `near the center (around ${Math.round(cx * 100)}% horizontal position)`;
}

/**
 * Build the keyframe edit instruction when 1 or more detected people are mapped to specific
 * character donors. Reference images are attached in order: `[donor_1, ..., donor_K, sourceFrame]`.
 */
export function buildMultiPersonJutsuEditPrompt(input: {
  mappings: readonly JutsuPersonMapping[];
  totalDetectedPeople?: number;
  relightId?: string;
  customLightPrompt?: string;
}): string {
  const sorted = [...input.mappings].sort(
    (a, b) => a.box.x + a.box.width / 2 - (b.box.x + b.box.width / 2),
  );
  if (sorted.length === 0) {
    return buildDefaultJutsuEditPrompt({
      mode: "character_swap",
      relightId: input.relightId,
      customLightPrompt: input.customLightPrompt,
      hasReferenceImage: true,
    });
  }

  const sourceImgIndex = sorted.length + 1;
  const assignments = sorted.map((m, i) => {
    const donorImgIndex = i + 1;
    const zone = horizontalZoneLabel(m.box);
    const outfitLock = m.characterOutfitSpec?.trim()
      ? ` wearing the exact full-body outfit from attached image ${donorImgIndex} (${m.characterOutfitSpec.trim()})`
      : ` wearing the exact full-body outfit and shoes from attached image ${donorImgIndex}`;
    return `replace Person #${m.personIndex} located ${zone} in attached image ${sourceImgIndex} with the person from attached image ${donorImgIndex}${outfitLock}, matching Person #${m.personIndex}'s exact body pose, limb placement, hand gesture, and camera angle`;
  });

  const keepOthers =
    (input.totalDetectedPeople ?? sorted.length) > sorted.length
      ? ` Keep any other unmapped people in attached image ${sourceImgIndex} completely unchanged in their original identity, clothes, and pose.`
      : "";

  const light = resolveJutsuLightText(input.relightId, input.customLightPrompt);
  const lightClause = light
    ? ` Relight the entire scene: ${light}`
    : ` Preserve the exact background, room geometry, props, and scene lighting from attached image ${sourceImgIndex}.`;

  return `Using attached image ${sourceImgIndex} as the base scene frame, ${assignments.join("; and ")}.${keepOthers}${lightClause}`;
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

// Verbatim prompts from Openjutsu `workflows/build/openjutsu_picture_pipeline.py` & `from_picture_describe_flux3.api.json`:
export const OPENJUTSU_DESCRIBE_VIDEO_PROMPT =
  'These are frames from one video clip, in time order, two per second. Describe what happens, for a video model that redoes the clip with a new person. Write one paragraph of 80 to 180 words in the present tense, calling the main person "the person". Go through the frames in order and name every change: what they do with their body, hands, head and mouth, such as blowing, eating, drinking, speaking, singing or laughing; every object they hold, use or touch, with its shape, colour and material, and what happens to it, such as candles going out or a lid opening; their facial expression and when it changes; where they look; what any other people do; and how the camera moves or cuts. Do not describe the person\'s hair, face, body or clothing, except a movement of hair or clothing, such as hair swinging or a hand fixing a collar. Say nothing about the light, its colours or the colour grade. No preamble, lists or Markdown.';

export const OPENJUTSU_DESCRIBE_PICTURE_PROMPT =
  "Describe this picture for a casting sheet in two sentences: first the person's hair, outfit and accessories, then the setting behind them. Say nothing about their pose, hands, expression or the light. No preamble.";

export const OPENJUTSU_REWRITE_SYSTEM_PROMPT = `You rewrite a video description for a new character. The user gives the new character and setting, then a description of what happens in the original video. The new video keeps the new character's looks and setting and the original video's actions. Rewrite the description as one paragraph of 60 to 160 words in the present tense, in the same time order, calling the main person "the character".

Keep every action, gesture, head turn, gaze direction, expression change, mouth action, speech or singing, and camera movement. Keep every object the person holds, uses or touches, with its shape, colour and material and what happens to it.
Fit everything tied to looks to the new character: never repeat the original person's hair, face, body or clothing; drop movements of hair, clothing or accessories the new character does not have, and describe the ones they do have as the new character's description gives them. Do not otherwise describe the new character's looks.
Move the action into the new setting: drop or replace furniture, walls, rooms, stages, landscapes and places from the description that the new setting does not have, and never describe the original setting. Keep objects the person uses.
Refer to other people only by what they do, such as "a second person", without their age, gender, hair, skin or clothing.
Never mention lighting, light colours, colour grading, pictures, frames or the original video. Output only the paragraph.`;

/**
 * Port of Openjutsu's Two-Pass Visual Describer (`from_picture_describe_flux3.api.json`):
 * - Node 73 (Pass 1): watches 2fps sampled frames from the source video section and extracts actions,
 *   held objects, mouth actions, facial expressions, gaze, and camera movement without the original person's looks.
 * - Node 80 (Pass 2a): describes the prepared picture's hair, outfit, accessories, and setting in 2 sentences
 *   (without mentioning pose, hands, expression, or light).
 * - Node 78 (Pass 2b): rewrites Pass 1 for the new character & setting using TEXT ONLY (never attaching the
 *   prepared image to the rewrite step, because showing the still image causes VLMs to describe its static pose
 *   instead of the video's chronological actions).
 */
export async function describeJutsuVideoMotion(input: {
  sampledFrameBuffers: Buffer[];
  preparedFrameBuffer?: Buffer;
  characterName?: string;
  relightText?: string;
}): Promise<string> {
  if (input.sampledFrameBuffers.length === 0) {
    return "The character performs natural continuous movement matching the motion guide from start to finish, with expressive facial micro-acting and smooth camera motion.";
  }

  try {
    const frameThumbs = await Promise.all(
      input.sampledFrameBuffers.slice(0, 20).map((buf) =>
        sharp(buf).resize(512, 512, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer(),
      ),
    );

    // Node 73: Pass 1 · describe the source video at 2 frames per second
    const rawAction = await callOpenRouterVision({
      system: "You are a precise sequential video action describer.",
      imageBuffers: frameThumbs,
      userText: OPENJUTSU_DESCRIBE_VIDEO_PROMPT,
    });

    if (!input.preparedFrameBuffer || !rawAction) {
      return (
        rawAction ||
        "The character performs natural continuous motion from the start frame to the end frame, keeping consistent identity, outfit, and lighting."
      );
    }

    // Node 80: Pass 2a · describe the prepared picture (hair, outfit, setting only — no pose/expression)
    const preparedThumb = await sharp(input.preparedFrameBuffer)
      .resize(768, 768, { fit: "inside" })
      .jpeg({ quality: 82 })
      .toBuffer();

    const pictureDescription = await callOpenRouterVision({
      system: "You describe a character casting still concisely in two sentences.",
      imageBuffers: [preparedThumb],
      userText: OPENJUTSU_DESCRIBE_PICTURE_PROMPT,
    });

    if (!pictureDescription) {
      return rawAction;
    }

    // Node 78: Pass 2b · TEXT-ONLY rewrite for the prepared picture (imageBuffers: [])
    const rewriteRequest = `New character and setting:\n${pictureDescription}\n\nOriginal video:\n${rawAction}`;
    const rewritten = await callOpenRouterVision({
      system: OPENJUTSU_REWRITE_SYSTEM_PROMPT,
      imageBuffers: [],
      userText: rewriteRequest,
    });

    return rewritten || rawAction;
  } catch {
    return "The character performs natural continuous motion from the start frame to the end frame, keeping consistent identity, outfit, and lighting.";
  }
}
