import type { CastMember } from "@/model/character";
import { characterSpecLine } from "@/model/character-spec";

// Text the director and image prompts share so every stage names the same cast.

// Frame prompts share a tight cap with the scene text; notes stay short there.
const FRAME_SPEC_CHARS = 220;
const DIRECTOR_SPEC_CHARS = 400;

function hasBoard(cast: CastMember[] | undefined) {
  return Boolean(cast?.some((member) => member.blueprintKind === "board"));
}

// "Name: notes" lines for cast members that carry a spec. Empty when none do.
export function castSpecLines(cast: CastMember[] | undefined, maxChars: number) {
  return (cast || [])
    .filter((member) => member.spec)
    .map((member) => `${member.name}: ${characterSpecLine(member.spec!, maxChars)}`);
}

// What a board reference is, so the model reads both panels as one person.
const BOARD_LAYOUT_NOTE =
  "A character board shows the SAME person twice: a face close-up on the left and one full-body standing figure on the right. Copy the face from the close-up and the body, outfit, and proportions from the standing figure. Never draw both panels.";

export type CharacterLockSource = {
  cast?: CastMember[];
  characterStillUrl?: string;
  characterImageUrl?: string;
};

// Selected cast blueprints first; otherwise the generated still / uploaded image.
export function characterReferenceUrls(source: CharacterLockSource): string[] {
  if (source.cast && source.cast.length > 0) return castReferenceUrls(source.cast);
  return [source.characterStillUrl, source.characterImageUrl].filter(
    (url): url is string => Boolean(url),
  );
}

// Scene stills attach one image per character. A second photo of the same person
// makes the model draw them again.
export function frameLockReferenceUrls(source: CharacterLockSource): string[] {
  if (source.cast && source.cast.length > 0) return castReferenceUrls(source.cast);
  const url = source.characterStillUrl || source.characterImageUrl;
  return url ? [url] : [];
}

// Same order as pipeline.ts: annotated redo, then the sibling still, then lock refs.
export function sceneImageReferenceUrls(input: {
  annotatedUrl?: string;
  anchorUrl?: string;
  lockUrls: string[];
}): string[] {
  return [input.annotatedUrl, input.anchorUrl, ...input.lockUrls].filter(
    (url): url is string => Boolean(url),
  );
}

export function directorImageParts(urls: string[]): Array<{ type: "image"; image: URL }> {
  return urls.flatMap((url) => {
    try {
      return [{ type: "image" as const, image: new URL(url) }];
    } catch {
      return [];
    }
  });
}

// Fetch bytes with the runtime `fetch`. Passing a URL lets the AI SDK
// dynamically require `undici`, which Next.js does not pack into serverless.
export async function loadDirectorImageParts(
  urls: string[],
): Promise<Array<{ type: "image"; image: Uint8Array }>> {
  const parts: Array<{ type: "image"; image: Uint8Array }> = [];
  for (const { image } of directorImageParts(urls)) {
    const response = await fetch(image);
    if (!response.ok) {
      throw new Error(`無法下載角色參考圖（${response.status}）`);
    }
    parts.push({
      type: "image",
      image: new Uint8Array(await response.arrayBuffer()),
    });
  }
  return parts;
}

// Deterministic lock when a cast is selected. Never invent clothing/hair —
// the attached blueprint is the only appearance source.
export type CastLookOptions = {
  wardrobeBuild?: boolean;
  // The brief says clothes follow a reference image. Face and hair still stay on the character.
  clothingFromReference?: boolean;
};

export function characterLockFromCast(cast: CastMember[], options?: CastLookOptions): string {
  const names = cast.map((member) => member.name).join("、");
  // Outfit reels change clothes. Lock the face and hair, not the blueprint outfit.
  if (options?.wardrobeBuild) {
    return `${names}：臉、髮型與身體比例一律以附加角色藍圖為準；服裝只跟衣服參考圖。禁止改臉或髮型。`;
  }
  if (options?.clothingFromReference) {
    return `${names}：臉與髮型一律以附加角色藍圖為準；服裝只跟指示指定的參考圖。禁止改臉或髮型，禁止抄參考圖裡的人。`;
  }
  return `${names}：外貌、髮型、服裝、配件與比例一律以附加角色藍圖為準；禁止另行描述或改動角色造型。`;
}

// No named cast: the uploaded character image is still the face and hair.
export function soloCharacterLock(options?: CastLookOptions) {
  if (options?.wardrobeBuild) {
    return "角色的臉與髮型一律以附加參考圖為準；服裝只跟衣服參考圖。禁止改臉或髮型。";
  }
  if (options?.clothingFromReference) {
    return "角色的臉與髮型一律以附加角色圖為準；服裝只跟指示指定的參考圖。禁止改臉或髮型，禁止抄參考圖裡的人。";
  }
  return "角色外貌一律以附加參考圖為準；禁止另行描述或改動髮型、臉型、服裝或配件。";
}

// A member created from an image alone carries no text description.
function isUndescribed(member: CastMember) {
  return member.prompt.trim().length === 0;
}

export function castBlockForPhaseA(cast: CastMember[] | undefined, options?: CastLookOptions) {
  if (!cast || cast.length === 0) return null;
  const wardrobeBuild = Boolean(options?.wardrobeBuild);
  const clothingFromReference = Boolean(options?.clothingFromReference) && !wardrobeBuild;
  const specLines = castSpecLines(cast, DIRECTOR_SPEC_CHARS);
  return [
    "Cast (use these exact names; they are the only recurring characters):",
    ...cast.map((member) =>
      isUndescribed(member)
        ? `- ${member.name}: (appearance defined only by the attached reference sheet)`
        : `- ${member.name}: ${member.prompt} (staging hint only; appearance still follows the attached reference sheet)`,
    ),
    // Appearance notes read from the photos: a text anchor beside the attached image.
    ...(specLines.length
      ? [
          "Appearance notes per cast member (read from their photos; the attached image still wins on rendering and colour):",
          ...specLines.map((line) => `- ${line}`),
        ]
      : []),
    ...(hasBoard(cast) ? [BOARD_LAYOUT_NOTE] : []),
    // Blueprint always wins. characterLock must never invent looks that later
    // fight the sheet in frame generation.
    wardrobeBuild
      ? "characterLock MUST only list the cast names and say face, hair, and proportions follow the attached character blueprint / reference sheet. Do NOT invent hair, face, gender, age, or colouring. Do NOT lock clothing to the blueprint. Name only garments copied from the clothing reference images in explainerScene."
      : clothingFromReference
        ? "characterLock MUST only list the cast names and say face and hair follow the attached character blueprint / reference sheet. Do NOT invent hair, face, gender, age, or colouring. Clothes follow the reference image only because the instruction says so. Name those garments in explainerScene. Do not copy the person in that photo."
        : "characterLock MUST only list the cast names and say their appearance follows the attached character blueprint / reference sheet. Do NOT invent or describe hair, face, clothing, accessories, gender, age, or colouring in characterLock, palette, or explainerScene.",
    wardrobeBuild
      ? "In explainerScene and motionCamera, refer to cast members by name and describe pose and the reference garments. Never invent hair or face, and never copy the person in a clothing photo."
      : clothingFromReference
        ? "In explainerScene and motionCamera, refer to cast members by name and describe pose, props, and the garments the instruction copies from the reference. Never invent hair or face, and never copy the person in the reference photo."
        : "In explainerScene and motionCamera, refer to cast members by name and describe pose, props, labels, and environment only — never invent outfit or hairstyle details.",
    "Reference cast members by name in explainerScene.",
    "The selected cast's reference images are attached. You MUST inspect them and follow those exact characters when planning every scene. Stage each shot around them as the subject. Do not invent a replacement hero. A scene reference never replaces their face or hair.",
    ...directorBlueprintSceneRules({ wardrobeBuild, clothingFromReference }),
  ].join("\n");
}

// Director must not treat the multi-pose sheet as a scene to stage.
export function directorBlueprintSceneRules(options?: CastLookOptions) {
  const clothingFromReference = Boolean(options?.clothingFromReference) && !options?.wardrobeBuild;
  return [
    "The attached image is a character BLUEPRINT / reference sheet only — not a scene to copy.",
    "It may be a two-panel board (face close-up + one standing figure) or a multi-pose sheet; either way it is one person.",
    options?.wardrobeBuild
      ? "The sheet may show many poses, turnarounds, walk cycles, or expression tiles of the SAME person. Use it only to lock face, hair, and proportions. Clothes come from the clothing reference images."
      : clothingFromReference
        ? "The sheet may show many poses, turnarounds, walk cycles, or expression tiles of the SAME person. Use it only to lock face, hair, and proportions. Clothes follow the reference image only because the instruction says so."
        : "The sheet may show many poses, turnarounds, walk cycles, or expression tiles of the SAME person. Use it only to lock face, hair, outfit, accessories, and proportions.",
    "Every still (start and end) must contain exactly ONE instance of each named cast member. Never stage a turnaround, walk-cycle, or expression grid. Never write two poses of the same person as if they share one frame.",
    "Start and end are two frozen moments of that same single figure. Put the travel (turn, step, look-up) in motionCamera only — still descriptions must be a resting pose, not in-between action like 'turning from side to front'.",
    options?.wardrobeBuild
      ? "Face, hair, and body proportions stay on the blueprint. From the first still she already wears the complete outfit in the clothing reference images, copied exactly for style, cut, colour, pattern, and details. Do not put clothes on across clips. Do not redesign, recolor, drop, or add a piece. Do not copy the person in the clothing photo. Never put worn items in visualWorld."
      : clothingFromReference
        ? "Face and hair stay on the blueprint in every clip. Clothes follow the reference image named by the instruction. Copy only the garments. Do not copy that photo's person, face, or hairstyle."
        : "Wardrobe is fixed to the blueprint in every clip, whatever the setting or weather. Never plan a costume change, weather gear (coats, gloves, hats, boots), or body-worn props (backpacks, harnesses, clip-on mics, helmets). Hand-held props are fine. Never put worn items in visualWorld either. A scene reference never replaces the character's face or hair.",
  ];
}

// Image models dress characters for the setting (snow → parka); this beats that.
export const FRAME_WARDROBE_LOCK =
  "WARDROBE LOCK: each character wears exactly their blueprint outfit (garments, colours, shoes, bag, accessories) whatever the weather, location, or activity. Never add or swap coats, jackets, hats, scarves, gloves, backpacks, or any worn gear.";

export const FRAME_WARDROBE_CHECK =
  "Final check: each character wears exactly the blueprint outfit, nothing added for the setting. Face and hair match the character blueprint, not anyone in a scene reference.";

// The brief said the clothes follow a reference. The person in that photo is not the character.
export const FRAME_WARDROBE_FROM_REFERENCE =
  "WARDROBE: face, haircut, and hair length stay exactly on the character blueprint. The instruction says the clothes follow the reference image, so copy only those garments. Do not copy the person, face, hair, or body in that photo.";

export const FRAME_WARDROBE_FROM_REFERENCE_CHECK =
  "Final check: face and hair match the character blueprint. Clothes follow the reference only as the instruction says. The person in the reference photo is not the character.";

// Outfit reel: the scene's garment list is the clothes. The blueprint still locks the face.
export const FRAME_WARDROBE_BUILD =
  "WARDROBE: the character image is the person. Copy that face, haircut, hair length, skin, age, and body. Wear the complete outfit in the clothing reference exactly — same style, cut, colour, pattern, and details. Do not copy clothes from the character image. Do not copy the person, face, hair, hair length, pose, or background in the clothing photo. Only the clothes change. She is already dressed, energetic and happy.";

export const FRAME_WARDROBE_BUILD_CHECK =
  "Final check: every garment matches the clothing reference in style and colour. Face and hair still match the character blueprint. She is not putting clothes on.";

// User-message note when there is no named cast.
export function phaseASoloCharacterNote(characterImageUrl?: string, options?: CastLookOptions) {
  if (characterImageUrl) {
    const wardrobeBuild = Boolean(options?.wardrobeBuild);
    const clothingFromReference = Boolean(options?.clothingFromReference) && !wardrobeBuild;
    return [
      "A character reference image is attached. You MUST inspect it.",
      wardrobeBuild
        ? "characterLock MUST only say face, hair, and proportions follow the attached reference image. Name garments copied from the clothing reference images in explainerScene."
        : clothingFromReference
          ? "characterLock MUST only say face and hair follow the attached character image. Clothes follow the reference image only because the instruction says so. Do not copy the person in that photo."
          : "characterLock MUST only say appearance follows the attached reference image — do NOT invent hair, face, clothing, or accessories.",
      wardrobeBuild
        ? "In explainerScene, describe pose and the reference garments. Never invent hair or face."
        : clothingFromReference
          ? "In explainerScene, describe pose, props, and the garments the instruction copies from the reference. Never invent hair or face."
          : "In explainerScene, describe pose and props only; never invent outfit details.",
      "Do not invent a replacement hero. A scene reference never replaces their face or hair.",
      ...directorBlueprintSceneRules({ wardrobeBuild, clothingFromReference }),
    ].join(" ");
  }
  // Skill-neutral: the whiteboard skill has a default everyman; other skills define their own cast in characterLock.
  return "No character reference image. Use the skill's default character if it defines one; otherwise define a simple locked cast in characterLock and keep it identical in every clip.";
}

export function castLineForPhaseB(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return "Cast reference sheets: none";
  return `Cast reference sheets: ${cast
    .map((member) => `${member.name} (${member.blueprintUrl})`)
    .join("; ")}`;
}

function attachmentLabel(start?: number, count?: number) {
  if (!start || !count) return "Cast reference sheets are attached; they are";
  if (count === 1) return `Attached image ${start} is the selected character blueprint; it is`;
  return `Attached images ${start}–${start + count - 1} are the selected character blueprints; they are`;
}

// Multi-pose sheets get copied into the still unless we say they are look-lock only.
const BLUEPRINT_REFERENCE_ONLY =
  "BLUEPRINT / reference sheet only — not a scene to copy: draw exactly ONE instance of each named cast member, even if the name is plural. Never copy the sheet layout or tile the same person.";

// Frame prompts: the attached blueprint outranks any text about the character,
// so a stale or guessed characterLock cannot redraw the cast. Kept compact —
// stills share a ~5000-char cap with the scene text.
export function castParagraphForFrames(
  cast: CastMember[] | undefined,
  attachment?: { start: number; count: number },
  options?: { wardrobeBuild?: boolean },
) {
  if (!cast || cast.length === 0) return [];
  const names = cast.map((member) => member.name).join(", ");
  if (options?.wardrobeBuild) {
    return [
      `${attachmentLabel(attachment?.start, attachment?.count)} the ONLY source of truth for this character's face, haircut, hair length, skin, age, and body. Cast: ${names}.`,
      "Draw exactly one person. Copy her face and hair from that image, including hair length. If it is a multi-pose sheet, do not copy the sheet layout.",
      "Do not copy the face, hair, hair length, or body of the person in the clothing photo. Only the clothes change. Worn garments follow the clothing reference exactly, not the clothes in the character image.",
    ];
  }
  const specLines = castSpecLines(cast, FRAME_SPEC_CHARS);
  return [
    `${attachmentLabel(attachment?.start, attachment?.count)} the ONLY source of truth for how each character looks (face, hair, outfit, accessories, proportions, gender). Cast: ${names}.`,
    BLUEPRINT_REFERENCE_ONLY,
    ...(hasBoard(cast) ? [BOARD_LAYOUT_NOTE] : []),
    ...(specLines.length
      ? [`Identity notes (match these; the attached image wins on rendering): ${specLines.join(" | ")}`]
      : []),
    "Ignore any clothing, hair, or style wording in the text — the blueprint wins. Do not invent a replacement hero or redesign their outfit.",
  ];
}

// No named cast: the generated still / uploaded image is still a hard lock.
export function soloCharacterParagraphForFrames(
  attachmentStart?: number,
  options?: { wardrobeBuild?: boolean },
) {
  const lead = attachmentStart
    ? `Attached image ${attachmentStart} is the selected character guideline; it is`
    : "The attached character guideline is";
  return [
    `${lead} the ONLY source of truth for how the character looks.`,
    BLUEPRINT_REFERENCE_ONLY,
    options?.wardrobeBuild
      ? "Face, haircut, hair length, skin, age, and body follow the attached guideline. Do not copy the person or the hair in the clothing photo. Only the clothes change. Worn garments follow the clothing reference."
      : "Ignore any clothing, hair, or style wording in the text — the attached guideline wins. Do not invent a replacement hero or redesign their outfit.",
  ];
}

// When a cast (or still) is attached, never echo Phase A's invented look text.
// Named cast returns null: the cast paragraph already names and locks everyone.
export function frameCharacterLockLine(
  cast: CastMember[] | undefined,
  hasCharacterImage: boolean,
  characterLock: string,
) {
  if (cast && cast.length > 0) return null;
  if (hasCharacterImage) {
    return "Locked character: appearance follows the attached character guideline only. Do not invent outfit or hairstyle from text.";
  }
  return `Locked character (must look identical in every frame): ${characterLock}`;
}

export function castReferenceUrls(cast: CastMember[] | undefined) {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const member of cast || []) {
    if (!member.blueprintUrl || seen.has(member.blueprintUrl)) continue;
    seen.add(member.blueprintUrl);
    urls.push(member.blueprintUrl);
  }
  return urls;
}
