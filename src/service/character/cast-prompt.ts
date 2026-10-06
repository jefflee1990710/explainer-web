import type { CastMember } from "@/model/character";

// Text the director and image prompts share so every stage names the same cast.

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

// Every scene still attaches the character blueprint (or solo still / upload).
export function frameLockReferenceUrls(source: CharacterLockSource): string[] {
  return characterReferenceUrls(source);
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
export function characterLockFromCast(
  cast: CastMember[],
  options?: { wardrobeBuild?: boolean },
): string {
  const names = cast.map((member) => member.name).join("、");
  // Outfit reels change clothes. Lock the face and hair, not the blueprint outfit.
  if (options?.wardrobeBuild) {
    return `${names}：臉、髮型與身體比例一律以附加角色藍圖為準；服裝只跟衣服參考圖。禁止改臉或髮型。`;
  }
  return `${names}：外貌、髮型、服裝、配件與比例一律以附加角色藍圖為準；禁止另行描述或改動角色造型。`;
}

// A member created from an image alone carries no text description.
function isUndescribed(member: CastMember) {
  return member.prompt.trim().length === 0;
}

export function castBlockForPhaseA(
  cast: CastMember[] | undefined,
  options?: { wardrobeBuild?: boolean },
) {
  if (!cast || cast.length === 0) return null;
  const wardrobeBuild = Boolean(options?.wardrobeBuild);
  return [
    "Cast (use these exact names; they are the only recurring characters):",
    ...cast.map((member) =>
      isUndescribed(member)
        ? `- ${member.name}: (appearance defined only by the attached reference sheet)`
        : `- ${member.name}: ${member.prompt} (staging hint only; appearance still follows the attached reference sheet)`,
    ),
    // Blueprint always wins. characterLock must never invent looks that later
    // fight the sheet in frame generation.
    wardrobeBuild
      ? "characterLock MUST only list the cast names and say face, hair, and proportions follow the attached character blueprint / reference sheet. Do NOT invent hair, face, gender, age, or colouring. Do NOT lock clothing to the blueprint. Name only garments copied from the clothing reference images in explainerScene."
      : "characterLock MUST only list the cast names and say their appearance follows the attached character blueprint / reference sheet. Do NOT invent or describe hair, face, clothing, accessories, gender, age, or colouring in characterLock, palette, or explainerScene.",
    wardrobeBuild
      ? "In explainerScene and motionCamera, refer to cast members by name and describe pose and the reference garments. Never invent hair or face, and never copy the person in a clothing photo."
      : "In explainerScene and motionCamera, refer to cast members by name and describe pose, props, labels, and environment only — never invent outfit or hairstyle details.",
    "Reference cast members by name in explainerScene.",
    "The selected cast's reference images are attached. You MUST inspect them and follow those exact characters when planning every scene. Stage each shot around them as the subject. Do not invent a replacement hero.",
    ...directorBlueprintSceneRules({ wardrobeBuild }),
  ].join("\n");
}

// Director must not treat the multi-pose sheet as a scene to stage.
export function directorBlueprintSceneRules(options?: { wardrobeBuild?: boolean }) {
  return [
    "The attached image is a character BLUEPRINT / reference sheet only — not a scene to copy.",
    options?.wardrobeBuild
      ? "The sheet may show many poses, turnarounds, walk cycles, or expression tiles of the SAME person. Use it only to lock face, hair, and proportions. Clothes come from the clothing reference images."
      : "The sheet may show many poses, turnarounds, walk cycles, or expression tiles of the SAME person. Use it only to lock face, hair, outfit, accessories, and proportions.",
    "Every still (start and end) must contain exactly ONE instance of each named cast member. Never stage a turnaround, walk-cycle, or expression grid. Never write two poses of the same person as if they share one frame.",
    "Start and end are two frozen moments of that same single figure. Put the travel (turn, step, look-up) in motionCamera only — still descriptions must be a resting pose, not in-between action like 'turning from side to front'.",
    options?.wardrobeBuild
      ? "Face, hair, and body proportions stay on the blueprint. Clip 1 start is a standing rest: opaque white crew-neck tank covering the shoulders and torso, plus white knee-length athletic shorts, hands at the sides — not holding a garment. Each later still adds exactly one garment copied from the clothing reference images. A reference bottom replaces those shorts. Do not revert to the blueprint outfit and do not invent clothes. Name the garments and their reference ids in explainerScene. Never put worn items in visualWorld."
      : "Wardrobe is fixed to the blueprint in every clip, whatever the setting or weather. Never plan a costume change, weather gear (coats, gloves, hats, boots), or body-worn props (backpacks, harnesses, clip-on mics, helmets). Hand-held props are fine. Never put worn items in visualWorld either.",
  ];
}

// Image models dress characters for the setting (snow → parka); this beats that.
export const FRAME_WARDROBE_LOCK =
  "WARDROBE LOCK: each character wears exactly their blueprint outfit (garments, colours, shoes, bag, accessories) whatever the weather, location, or activity. Never add or swap coats, jackets, hats, scarves, gloves, backpacks, or any worn gear.";

export const FRAME_WARDROBE_CHECK =
  "Final check: each character wears exactly the blueprint outfit, nothing added for the setting.";

// Outfit reel: the scene's garment list is the clothes. The blueprint still locks the face.
export const FRAME_WARDROBE_BUILD =
  "WARDROBE BUILD: keep the face and hair from the character blueprint. Wear exactly the garments named in the Scene. Do not copy clothes from the character blueprint. Copy only the named garment's cut, colour, and details from the clothing photo. Do not copy the person, pose, or background in that photo.";

export const FRAME_WARDROBE_BUILD_CHECK =
  "Final check: clothes match the Scene and the clothing reference. Face and hair still match the character blueprint.";

// User-message note when there is no named cast.
export function phaseASoloCharacterNote(
  characterImageUrl?: string,
  options?: { wardrobeBuild?: boolean },
) {
  if (characterImageUrl) {
    const wardrobeBuild = Boolean(options?.wardrobeBuild);
    return [
      "A character reference image is attached. You MUST inspect it.",
      wardrobeBuild
        ? "characterLock MUST only say face, hair, and proportions follow the attached reference image. Name garments copied from the clothing reference images in explainerScene."
        : "characterLock MUST only say appearance follows the attached reference image — do NOT invent hair, face, clothing, or accessories.",
      wardrobeBuild
        ? "In explainerScene, describe pose and the reference garments. Never invent hair or face."
        : "In explainerScene, describe pose and props only; never invent outfit details.",
      "Do not invent a replacement hero.",
      ...directorBlueprintSceneRules({ wardrobeBuild }),
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
  "BLUEPRINT / reference sheet only — not a scene to copy: draw exactly ONE instance of each named cast member. Never copy the sheet layout or tile the same person.";

// Frame prompts: the attached blueprint outranks any text about the character,
// so a stale or guessed characterLock cannot redraw the cast. Kept compact —
// stills share a ~5000-char cap with the scene text.
export function castParagraphForFrames(
  cast: CastMember[] | undefined,
  attachment?: { start: number; count: number },
  options?: { wardrobeBuild?: boolean },
) {
  if (!cast || cast.length === 0) return [];
  return [
    `${attachmentLabel(attachment?.start, attachment?.count)} the ONLY source of truth for how each character looks (face, hair, outfit, accessories, proportions, gender). Cast: ${cast.map((member) => member.name).join(", ")}.`,
    BLUEPRINT_REFERENCE_ONLY,
    options?.wardrobeBuild
      ? "Face, hair, and body proportions follow the blueprint. Worn garments follow the Scene and the clothing reference, not the blueprint outfit. Do not invent a replacement hero, extra clothes, or the person in the clothing photo."
      : "Ignore any clothing, hair, or style wording in the text — the blueprint wins. Do not invent a replacement hero or redesign their outfit.",
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
      ? "Face, hair, and body proportions follow the attached guideline. Worn garments follow the Scene and the clothing reference. Do not invent a replacement hero or extra clothes."
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
  return (cast || []).map((member) => member.blueprintUrl);
}
