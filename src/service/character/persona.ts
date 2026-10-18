import {
  PERSONA_HUMOR,
  PERSONA_INTERESTS_MAX,
  PERSONA_PACE,
  PERSONA_WARMTH,
  parseCharacterPersona,
  type CharacterPersona,
  type PersonaHumor,
  type PersonaPace,
  type PersonaWarmth,
} from "@/model/character-persona";

// One editable row in the create form and the character page.
export type PersonaDraft = {
  city: string;
  warmth: PersonaWarmth;
  pace: PersonaPace;
  humor: PersonaHumor;
  summary: string;
  interests: string;
};

// Coherent packs so a dice roll does not mix a city with unrelated hobbies.
const PERSONA_PACKS: readonly CharacterPersona[] = [
  {
    city: "Hong Kong",
    warmth: "warm",
    pace: "quick",
    humor: "teasing",
    summary: "Sweet-tongued, but always in a hurry.",
    interests: ["milk tea", "night runs", "street snaps"],
  },
  {
    city: "Taipei",
    warmth: "warm",
    pace: "slow",
    humor: "straight",
    summary: "Slow to open up, and notices small things.",
    interests: ["bookstores", "pour-over coffee", "metro rides"],
  },
  {
    city: "Tokyo",
    warmth: "direct",
    pace: "even",
    humor: "straight",
    summary: "Polite, quiet, and precise.",
    interests: ["convenience stores", "parks", "headphones"],
  },
  {
    city: "Seoul",
    warmth: "warm",
    pace: "quick",
    humor: "playful",
    summary: "Bright, a little competitive, likes a clean look.",
    interests: ["cafes", "late noodles", "photo booths"],
  },
  {
    city: "Singapore",
    warmth: "direct",
    pace: "quick",
    humor: "playful",
    summary: "Practical, upbeat, and always between two places.",
    interests: ["hawker food", "night walks", "houseplants"],
  },
  {
    city: "London",
    warmth: "direct",
    pace: "even",
    humor: "teasing",
    summary: "Dry humour, unhurried, observant.",
    interests: ["pubs", "thrift shops", "rainy buses"],
  },
  {
    city: "New York",
    warmth: "sharp",
    pace: "quick",
    humor: "teasing",
    summary: "Blunt, fast, and fond of a good corner.",
    interests: ["bagels", "stoops", "late trains"],
  },
  {
    city: "Paris",
    warmth: "direct",
    pace: "slow",
    humor: "playful",
    summary: "Unhurried, a bit particular, enjoys the walk.",
    interests: ["bakeries", "riverside", "small museums"],
  },
];

const WARMTH_LINE: Record<PersonaWarmth, string> = {
  warm: "warm and friendly",
  direct: "plain and direct",
  sharp: "sharp and a little impatient",
};

const PACE_LINE: Record<PersonaPace, string> = {
  slow: "slow",
  even: "even",
  quick: "quick",
};

const HUMOR_LINE: Record<PersonaHumor, string> = {
  straight: "serious",
  playful: "playful",
  teasing: "teasing",
};

export function emptyPersonaDraft(): PersonaDraft {
  return {
    city: "",
    warmth: "warm",
    pace: "even",
    humor: "playful",
    summary: "",
    interests: "",
  };
}

export function draftFromPersona(persona: CharacterPersona): PersonaDraft {
  return {
    city: persona.city,
    warmth: persona.warmth,
    pace: persona.pace,
    humor: persona.humor,
    summary: persona.summary,
    interests: persona.interests.join(", "),
  };
}

function asAxis<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

// Blank city, summary, and interests mean the user has not set a persona yet.
export function personaFromFields(draft: PersonaDraft): CharacterPersona | null {
  const interests = draft.interests
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, PERSONA_INTERESTS_MAX);
  return parseCharacterPersona({
    city: draft.city,
    warmth: asAxis(draft.warmth, PERSONA_WARMTH, "warm"),
    pace: asAxis(draft.pace, PERSONA_PACE, "even"),
    humor: asAxis(draft.humor, PERSONA_HUMOR, "playful"),
    summary: draft.summary,
    interests,
  });
}

export function randomCharacterPersona(rng: () => number = Math.random): CharacterPersona {
  const index = Math.floor(rng() * PERSONA_PACKS.length);
  const pack = PERSONA_PACKS[index] ?? PERSONA_PACKS[0];
  return { ...pack, interests: [...pack.interests] };
}

// Wording and delivery for dialogue. The acoustic lock stays on the voice record.
export function personaDeliveryLine(persona: CharacterPersona): string {
  const parts = [
    `speaks in a ${WARMTH_LINE[persona.warmth]} tone, at a ${PACE_LINE[persona.pace]} pace, ${HUMOR_LINE[persona.humor]}`,
  ];
  if (persona.summary) parts.push(persona.summary.replace(/\s+/g, " ").trim());
  if (persona.city) parts.push(`lives in ${persona.city}`);
  if (persona.interests.length) parts.push(`may mention ${persona.interests.join(", ")}`);
  return parts.join("; ");
}
