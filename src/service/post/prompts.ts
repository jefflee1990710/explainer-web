import type {
  DetectedPostElement,
  PostElementEditMode,
} from "@/model/post";

function spatialZoneDescription(box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): string {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const hZone =
    cx < 0.36
      ? "on the left"
      : cx > 0.64
        ? "on the right"
        : "near the horizontal center";
  const vZone =
    cy < 0.34
      ? "in the upper area"
      : cy > 0.66
        ? "in the lower area"
        : "in the middle vertical zone";
  return `${hZone}, ${vZone} (around ${Math.round(cx * 100)}% X, ${Math.round(cy * 100)}% Y, spanning ${Math.round(box.width * 100)}% width by ${Math.round(box.height * 100)}% height)`;
}

export function postTaskTitle(post: {
  prompt?: string;
  instruction?: string;
  layers?: Array<{ type: string; text?: string }>;
}): string {
  const direct = (post.prompt || post.instruction || "").trim();
  if (direct) {
    return direct.length > 48 ? `${direct.slice(0, 48)}…` : direct;
  }
  const layerText = post.layers?.find((l) => l.type === "text" && l.text?.trim())?.text?.trim();
  if (layerText) {
    return layerText.length > 48 ? `${layerText.slice(0, 48)}…` : layerText;
  }
  return "未命名貼文";
}

/**
 * Build the initial Seedream 5.0 Pro post creation prompt.
 * Reference images are attached in deterministic ordinal order:
 * `[...castLookUrls, ...productBlueprintUrls, referenceImageUrl?]`
 */
export function buildPostCreatePrompt(input: {
  prompt: string;
  styleName?: string;
  styleLook?: string;
  cast?: Array<{ name: string; outfitSpec?: string }>;
  products?: Array<{ name: string }>;
  hasReferenceImage?: boolean;
}): string {
  const parts: string[] = [];
  let imageOrdinal = 1;

  const castList = input.cast ?? [];
  if (castList.length > 0) {
    const castNotes = castList.map((member) => {
      const idx = imageOrdinal++;
      const outfit = member.outfitSpec?.trim()
        ? ` wearing the exact full-body outfit (${member.outfitSpec.trim()})`
        : ` keeping the exact face, hairstyle, and outfit`;
      return `from attached image ${idx}, character "${member.name}"${outfit}`;
    });
    parts.push(`Feature ${castNotes.join(" and ")}.`);
  }

  const productList = input.products ?? [];
  if (productList.length > 0) {
    const prodNotes = productList.map((item) => {
      const idx = imageOrdinal++;
      return `from attached image ${idx}, product "${item.name}" matching its exact packaging, logo, shape, and colors`;
    });
    parts.push(`Include ${prodNotes.join(" and ")}.`);
  }

  if (input.hasReferenceImage) {
    const idx = imageOrdinal++;
    parts.push(
      `Follow the overall layout, framing, and visual mood of attached image ${idx}.`,
    );
  }

  if (input.styleLook?.trim()) {
    parts.push(
      `Visual style (${input.styleName || "Custom Style"}): ${input.styleLook.trim()}.`,
    );
  } else if (input.styleName?.trim()) {
    parts.push(`Visual style: ${input.styleName.trim()}.`);
  }

  const corePrompt = input.prompt.trim();
  parts.push(
    `Create a high-impact social media post / poster image: ${corePrompt}. Render any requested headline or typography with crisp, legible editorial lettering integrated naturally into the composition.`,
  );

  return parts.join(" ");
}

/**
 * Build the Seedream 5.0 Pro element modification prompt for a selected SAM 3 RLE element.
 * - For `swap_character` with a donor image: reference order is `[donorImageUrl, currentPostImageUrl]`
 *   (`attached image 1` = character donor, `attached image 2` = current post image).
 * - For all other modes: reference order is `[currentPostImageUrl, donorImageUrl?]`
 *   (`attached image 1` = current post image, `attached image 2` = optional product/object donor).
 */
export function buildPostElementEditPrompt(input: {
  element: Pick<
    DetectedPostElement,
    "category" | "categoryIndex" | "label" | "box"
  >;
  editMode: PostElementEditMode;
  instruction?: string;
  characterName?: string;
  characterOutfitSpec?: string;
  productName?: string;
  hasDonorImage?: boolean;
}): string {
  const { element, editMode } = input;
  const zone = spatialZoneDescription(element.box);
  const targetDesc = `${element.label} located ${zone}`;
  const extraInstruction = (input.instruction || "").trim();

  if (editMode === "remove") {
    return `Remove the ${targetDesc} from attached image 1 and seamlessly fill the region with the surrounding background texture and lighting. Keep all other people, objects, and typography in attached image 1 completely unchanged.`;
  }

  if (element.category === "person" && editMode === "swap_character" && input.hasDonorImage) {
    const outfitClause = input.characterOutfitSpec?.trim()
      ? ` wearing the exact full-body outfit from attached image 1 (${input.characterOutfitSpec.trim()})`
      : ` wearing the exact full-body outfit and hairstyle from attached image 1`;
    const charLabel = input.characterName?.trim()
      ? `the character "${input.characterName.trim()}" from attached image 1`
      : "the person from attached image 1";
    const noteClause = extraInstruction ? ` Additional detail: ${extraInstruction}.` : "";
    return `Using attached image 2 as the base post image, replace ${targetDesc} in attached image 2 with ${charLabel}${outfitClause}, matching the original person's body pose, framing, and scene lighting.${noteClause} Keep all other people, objects, text typography, and background in attached image 2 completely unchanged.`;
  }

  if (element.category === "text") {
    const newText = extraInstruction || element.label;
    return `In attached image 1, change the text at ${targetDesc} to read "${newText}". Preserve the exact font style, typography weight, color palette, alignment, and graphic layout of the original text, and keep all people, objects, and background in attached image 1 completely unchanged.`;
  }

  if (editMode === "replace_product" || input.hasDonorImage) {
    const donorDesc = input.productName?.trim()
      ? `the product "${input.productName.trim()}" shown in attached image 2`
      : "the item shown in attached image 2";
    const noteClause = extraInstruction ? ` (${extraInstruction})` : "";
    return `In attached image 1, replace ${targetDesc} with ${donorDesc}${noteClause}, matching natural perspective, scale, contact shadows, and scene lighting. Keep all people, typography, and the rest of attached image 1 completely unchanged.`;
  }

  const changeTarget = extraInstruction || `a refined version of ${element.label}`;
  return `In attached image 1, modify ${targetDesc} into ${changeTarget}, maintaining natural lighting, perspective, and shadows. Keep all other people, objects, typography, and background in attached image 1 completely unchanged.`;
}
