import type { CastMember } from "@/types/character";

// Text the director and image prompts share so every stage names the same cast.

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
    // The director is text-only and never sees the blueprint. If it is allowed
    // to guess an undescribed member's looks, that guess ends up in every frame
    // prompt and overrides the attached sheet. Forbid guessing instead.
    ...(anyUndescribed
      ? [
          "Some cast members have no text description. Do NOT invent or describe hair, face, clothing, accessories, gender or age for them anywhere (characterLock, palette, explainerScene).",
          "For such members, characterLock must only list the cast names and say their appearance follows the attached reference sheet.",
        ]
      : ["Write characterLock as a compact summary of the cast above."]),
    "Reference cast members by name in explainerScene.",
  ].join("\n");
}

export function castLineForPhaseB(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return "Cast reference sheets: none";
  return `Cast reference sheets: ${cast
    .map((member) => `${member.name} (${member.blueprintUrl})`)
    .join("; ")}`;
}

// Frame prompts: the attached blueprint outranks any text about the character,
// so a stale or guessed characterLock cannot redraw the cast.
export function castParagraphForFrames(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return [];
  return [
    "Cast reference sheets are attached; they are the ONLY source of truth for how each character looks. Match each sheet exactly (face, hair, outfit, proportions, gender). If any text below conflicts with a sheet, the reference sheet wins.",
    `Cast names: ${cast.map((member) => member.name).join(", ")}.`,
  ];
}

export function castReferenceUrls(cast: CastMember[] | undefined) {
  return (cast || []).map((member) => member.blueprintUrl);
}
