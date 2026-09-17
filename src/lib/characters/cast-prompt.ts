import type { CastMember } from "@/types/character";

// Text the director and image prompts share so every stage names the same cast.

export function castBlockForPhaseA(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return null;
  return [
    "Cast (use these exact names; they are the only recurring characters):",
    ...cast.map((member) => `- ${member.name}: ${member.prompt}`),
    "Write characterLock as a compact summary of the cast above.",
    "Reference cast members by name in explainerScene.",
  ].join("\n");
}

export function castLineForPhaseB(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return "Cast reference sheets: none";
  return `Cast reference sheets: ${cast
    .map((member) => `${member.name} (${member.blueprintUrl})`)
    .join("; ")}`;
}

export function castParagraphForFrames(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return [];
  return [
    "Cast reference sheets are attached; each character must match its sheet exactly (face, hair, outfit, proportions).",
    `Cast names: ${cast.map((member) => member.name).join(", ")}.`,
  ];
}

export function castReferenceUrls(cast: CastMember[] | undefined) {
  return (cast || []).map((member) => member.blueprintUrl);
}
