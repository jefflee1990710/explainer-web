import type { CastMember } from "@/types/character";

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

export function directorImageParts(urls: string[]): Array<{ type: "image"; image: URL }> {
  return urls.flatMap((url) => {
    try {
      return [{ type: "image" as const, image: new URL(url) }];
    } catch {
      return [];
    }
  });
}

// A member created from an image alone carries no text description.
function isUndescribed(member: CastMember) {
  return member.prompt.trim().length === 0;
}

export function castBlockForPhaseA(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return null;
  const anyUndescribed = cast.some(isUndescribed);
  return [
    "Cast (use these exact names; they are the only recurring characters):",
    ...cast.map((member) =>
      isUndescribed(member)
        ? `- ${member.name}: (appearance defined only by the attached reference sheet)`
        : `- ${member.name}: ${member.prompt}`,
    ),
    // The director now sees the attached sheets, but must not invent extra
    // looks in characterLock that could fight the images later.
    ...(anyUndescribed
      ? [
          "Some cast members have no text description. Do NOT invent or describe hair, face, clothing, accessories, gender or age for them anywhere (characterLock, palette, explainerScene).",
          "For such members, characterLock must only list the cast names and say their appearance follows the attached reference sheet.",
        ]
      : ["Write characterLock as a compact summary of the cast above."]),
    "Reference cast members by name in explainerScene.",
    "The selected cast's reference images are attached. You MUST inspect them and follow those exact characters when planning every scene (characterLock, explainerScene, motionCamera). Stage each shot around them as the subject. Do not invent a replacement hero.",
  ].join("\n");
}

// User-message note when there is no named cast.
export function phaseASoloCharacterNote(characterImageUrl?: string) {
  if (characterImageUrl) {
    return "A character reference image is attached. You MUST inspect it, lock that exact character, and follow it when planning every scene. Do not invent a replacement hero.";
  }
  return "No character reference image. Use the default locked everyman from the skill.";
}

export function castLineForPhaseB(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return "Cast reference sheets: none";
  return `Cast reference sheets: ${cast
    .map((member) => `${member.name} (${member.blueprintUrl})`)
    .join("; ")}`;
}

function attachmentLabel(start?: number, count?: number) {
  if (!start || !count) return "Cast reference sheets are attached; they are";
  if (count === 1) return `Attached image ${start} is the selected character reference; it is`;
  return `Attached images ${start}–${start + count - 1} are the selected character references; they are`;
}

// Frame prompts: the attached blueprint outranks any text about the character,
// so a stale or guessed characterLock cannot redraw the cast.
export function castParagraphForFrames(
  cast: CastMember[] | undefined,
  attachment?: { start: number; count: number },
) {
  if (!cast || cast.length === 0) return [];
  return [
    `${attachmentLabel(attachment?.start, attachment?.count)} the ONLY source of truth for how each character looks. Match each sheet exactly (face, hair, outfit, proportions, gender). If any text below conflicts with a sheet, the reference sheet wins.`,
    `Cast names: ${cast.map((member) => member.name).join(", ")}.`,
    "Plan this scene around these exact characters as the subject. Draw them as they appear on the attached sheets. Do not invent a replacement hero.",
  ];
}

// No named cast: the generated still / uploaded image is still a hard lock.
export function soloCharacterParagraphForFrames(attachmentStart?: number) {
  const lead = attachmentStart
    ? `Attached image ${attachmentStart} is the selected character reference; it is`
    : "The attached character reference is";
  return [
    `${lead} the ONLY source of truth for how the character looks.`,
    "Plan this scene around that exact character as the subject. Draw them as they appear in the reference. Do not invent a replacement hero.",
  ];
}

export function castReferenceUrls(cast: CastMember[] | undefined) {
  return (cast || []).map((member) => member.blueprintUrl);
}
