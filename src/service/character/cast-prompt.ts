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

// Same order as pipeline.ts: annotated redo, then lock refs.
export function sceneImageReferenceUrls(input: {
  annotatedUrl?: string;
  lockUrls: string[];
}): string[] {
  return [input.annotatedUrl, ...input.lockUrls].filter(
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
export function characterLockFromCast(cast: CastMember[]): string {
  const names = cast.map((member) => member.name).join("、");
  return `${names}：外貌、髮型、服裝、配件與比例一律以附加角色藍圖為準；禁止另行描述或改動角色造型。`;
}

// A member created from an image alone carries no text description.
function isUndescribed(member: CastMember) {
  return member.prompt.trim().length === 0;
}

export function castBlockForPhaseA(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return null;
  return [
    "Cast (use these exact names; they are the only recurring characters):",
    ...cast.map((member) =>
      isUndescribed(member)
        ? `- ${member.name}: (appearance defined only by the attached reference sheet)`
        : `- ${member.name}: ${member.prompt} (staging hint only; appearance still follows the attached reference sheet)`,
    ),
    // Blueprint always wins. characterLock must never invent looks that later
    // fight the sheet in frame generation.
    "characterLock MUST only list the cast names and say their appearance follows the attached character blueprint / reference sheet. Do NOT invent or describe hair, face, clothing, accessories, gender, age, or colouring in characterLock, palette, or explainerScene.",
    "In explainerScene and motionCamera, refer to cast members by name and describe pose, props, labels, and environment only — never invent outfit or hairstyle details.",
    "Reference cast members by name in explainerScene.",
    "The selected cast's reference images are attached. You MUST inspect them and follow those exact characters when planning every scene. Stage each shot around them as the subject. Do not invent a replacement hero.",
    ...directorBlueprintSceneRules(),
  ].join("\n");
}

// Director must not treat the multi-pose sheet as a scene to stage.
export function directorBlueprintSceneRules() {
  return [
    "The attached image is a character BLUEPRINT / reference sheet only — not a scene to copy.",
    "The sheet may show many poses, turnarounds, walk cycles, or expression tiles of the SAME person. Use it only to lock face, hair, outfit, accessories, and proportions.",
    "Every still (start and end) must contain exactly ONE instance of each named cast member. Never stage a turnaround, walk-cycle, or expression grid. Never write two poses of the same person as if they share one frame.",
    "Start and end are two frozen moments of that same single figure. Put the travel (turn, step, look-up) in motionCamera only — still descriptions must be a resting pose, not in-between action like 'turning from side to front'.",
  ];
}

// User-message note when there is no named cast.
export function phaseASoloCharacterNote(characterImageUrl?: string) {
  if (characterImageUrl) {
    return [
      "A character reference image is attached. You MUST inspect it.",
      "characterLock MUST only say appearance follows the attached reference image — do NOT invent hair, face, clothing, or accessories.",
      "In explainerScene, describe pose and props only; never invent outfit details.",
      "Do not invent a replacement hero.",
      ...directorBlueprintSceneRules(),
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
const BLUEPRINT_REFERENCE_ONLY = [
  "That attached image is a character BLUEPRINT / reference sheet only — not a scene to copy.",
  "The sheet may show many poses, turnarounds, walk cycles, or expression tiles of the SAME person. Use it only to match face, hair, outfit, accessories, and proportions.",
  "The finished still must contain exactly ONE instance of each named cast member. Never copy the sheet layout, never stack or tile the same person, never draw extra clones.",
];

// Frame prompts: the attached blueprint outranks any text about the character,
// so a stale or guessed characterLock cannot redraw the cast.
export function castParagraphForFrames(
  cast: CastMember[] | undefined,
  attachment?: { start: number; count: number },
) {
  if (!cast || cast.length === 0) return [];
  return [
    `${attachmentLabel(attachment?.start, attachment?.count)} the ONLY source of truth for how each character looks. Match each blueprint exactly (face, hair, outfit, accessories, proportions, gender).`,
    ...BLUEPRINT_REFERENCE_ONLY,
    "Ignore any clothing, hair, or style wording in the scene text, palette, or locked-character note — the blueprint wins.",
    `Cast names: ${cast.map((member) => member.name).join(", ")}.`,
    "Plan this scene around these exact characters as the subject. Draw one figure per named character, matching the look on the attached blueprints. Do not invent a replacement hero or redesign their outfit.",
  ];
}

// No named cast: the generated still / uploaded image is still a hard lock.
export function soloCharacterParagraphForFrames(attachmentStart?: number) {
  const lead = attachmentStart
    ? `Attached image ${attachmentStart} is the selected character guideline; it is`
    : "The attached character guideline is";
  return [
    `${lead} the ONLY source of truth for how the character looks.`,
    ...BLUEPRINT_REFERENCE_ONLY,
    "Ignore any clothing, hair, or style wording in the scene text — the attached guideline wins.",
    "Plan this scene around that exact character as the subject. Draw one figure matching the look in the guideline. Do not invent a replacement hero or redesign their outfit.",
  ];
}

// When a cast (or still) is attached, never echo Phase A's invented look text.
export function frameCharacterLockLine(
  cast: CastMember[] | undefined,
  hasCharacterImage: boolean,
  characterLock: string,
) {
  if (cast && cast.length > 0) {
    return `Locked cast (names only; appearance follows the attached blueprint only): ${cast
      .map((member) => member.name)
      .join(", ")}.`;
  }
  if (hasCharacterImage) {
    return "Locked character: appearance follows the attached character guideline only. Do not invent outfit or hairstyle from text.";
  }
  return `Locked character (must look identical in every frame): ${characterLock}`;
}

export function castReferenceUrls(cast: CastMember[] | undefined) {
  return (cast || []).map((member) => member.blueprintUrl);
}
