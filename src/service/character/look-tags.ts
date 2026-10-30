// Controlled vocabulary + tag/description helpers for wardrobe, hair, and related catalogs.
// Tags power UI chips, MCP search_looks, and free-text ranking.

import type {
  AnyCharacterLookPart,
  CharacterLookOption,
  CharacterWardrobePart,
} from "@/service/character/character-look";
import { lookOptionCategory } from "@/service/character/character-look";
import { lookSilhouette } from "@/service/character/look-silhouettes";

/** Curated tag chips shown in the look picker (subset of the full vocabulary). */
export const LOOK_FILTER_TAGS = [
  "casual",
  "athletic",
  "yoga",
  "tennis",
  "pickleball",
  "street",
  "heritage",
  "editorial",
  "formal",
  "lounge",
  "summer",
  "winter",
] as const;

export type LookFilterTag = (typeof LOOK_FILTER_TAGS)[number];

const ACTIVITY_KEYWORDS: Array<{ tag: string; re: RegExp }> = [
  { tag: "yoga", re: /\byoga\b|\bpilates\b|\bbarre\b/i },
  { tag: "tennis", re: /\btennis\b/i },
  { tag: "pickleball", re: /\bpickleball\b|\bpeek-?a-?boo\b|\bpadel\b/i },
  { tag: "running", re: /\brun(ning|ner)?\b|\bmarathon\b/i },
  { tag: "cycling", re: /\bcycl(e|ing)\b|\bbike\b/i },
  { tag: "boxing", re: /\bboxing\b|\bmma\b/i },
  { tag: "golf", re: /\bgolf\b/i },
  { tag: "swimming", re: /\bswim\b|\bsurf\b|\brashguard\b|\bboardshort/i },
  { tag: "skiing", re: /\bski\b|\bsnowboard\b/i },
  { tag: "basketball", re: /\bbasketball\b|\bbball\b/i },
  { tag: "soccer", re: /\bsoccer\b|\bfootball\b/i },
  { tag: "hiking", re: /\bhike\b|\btrail\b|\bhiking\b/i },
  { tag: "baseball", re: /\bbaseball\b/i },
  { tag: "climbing", re: /\bclimb\b|\bboulder\b/i },
];

const REGION_KEYWORDS: Array<{ tag: string; re: RegExp }> = [
  { tag: "korea", re: /\bkorea|seoul|hanbok|jeogori|baji\b/i },
  { tag: "japan", re: /\bjapan|tokyo|kimono|haori|yukata|noragi|geta|tabi|hime\b/i },
  { tag: "china", re: /\bchinese|shanghai|qipao|cheongsam|neo-chinese|tangzhuang\b/i },
  { tag: "india", re: /\bindia|bandhgala|sari|choli|kurta|salwar\b/i },
  { tag: "africa", re: /\bafrica|ankara|habesha|sapeur|gele|lagos|addis\b/i },
  { tag: "middleeast", re: /\bmiddle.?east|tehran|manteau|cairo|keffiyeh|hijab\b/i },
  { tag: "sea", re: /\bindonesia|batik|vietnam|aodai|saigon|manila|barong|thai|bangkok\b/i },
  { tag: "latin", re: /\blatin|mexico|huarache|guayabera|acapulco|brazil|ipanema|rio\b/i },
  { tag: "europe", re: /\beurope|paris|italian|london|berlin|lederhosen|german\b/i },
  { tag: "us", re: /\bamerican|nyc|ivy league|cowboy|varsity\b/i },
];

const VIBE_KEYWORDS: Array<{ tag: string; re: RegExp }> = [
  { tag: "casual", re: /\bcasual\b|\btee\b|\bt-shirt\b|\bhoodie\b|\bsweat\b|\bdenim\b|\bjean/i },
  { tag: "lounge", re: /\blounge\b|\bcozy\b|\bhome\b|\bknit\b|\bcashmere\b|\brobe\b/i },
  { tag: "street", re: /\bstreet\b|\bstreetwear\b|\bbaggy\b|\btechwear\b|\bgorpcore\b/i },
  { tag: "formal", re: /\bformal\b|\btailored\b|\bsuit\b|\bluxury\b|\bblazer\b|\boxford\b/i },
  { tag: "editorial", re: /\beditorial\b|\brunway\b|\bquiet luxury\b|\bold money\b/i },
  { tag: "heritage", re: /\bheritage\b|\btraditional\b|\bvintage\b/i },
  { tag: "athletic", re: /\bathletic\b|\bsport\b|\bperformance\b|\bcompression\b|\bmoisture\b/i },
  { tag: "summer", re: /\bsummer\b|\blinen\b|\bresort\b|\bbeach\b|\bsandal\b|\bstraw\b/i },
  { tag: "winter", re: /\bwinter\b|\bwool\b|\bcoat\b|\bparka\b|\bscarf\b|\bbeanie\b/i },
];

function unique(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function matchKeywords(text: string, table: Array<{ tag: string; re: RegExp }>) {
  const hits: string[] = [];
  for (const row of table) {
    if (row.re.test(text)) hits.push(row.tag);
  }
  return hits;
}

/** Prefer explicit description; otherwise the generation prompt doubles as searchable copy. */
export function lookOptionDescription(option: CharacterLookOption) {
  const text = (option.description ?? option.prompt).trim();
  return text;
}

/** Merge author tags with inferred activity / region / vibe tags from id + prompt. */
export function lookOptionTags(
  part: AnyCharacterLookPart,
  option: CharacterLookOption,
): string[] {
  const text = `${option.id} ${lookOptionDescription(option)}`;
  const tags: string[] = [...(option.tags ?? [])];

  tags.push(part);
  tags.push(lookOptionCategory(part, option.id));
  // Jeans / mini / bob and the other cuts stay searchable without joining the vibe chips.
  const silhouette = lookSilhouette(part, option);
  if (silhouette) tags.push(silhouette);

  if (option.id.startsWith("sp") || /sport|athletic|pickleball|tennis|yoga/i.test(option.id)) {
    tags.push("athletic");
  }
  if (option.id.startsWith("pb") || option.id.startsWith("vc")) {
    tags.push("editorial", "branding");
  }
  if (option.id.startsWith("al")) {
    tags.push("casual", "street");
  }
  if (option.id.startsWith("sppickle") || /peek.?a.?boo|pickleball/i.test(text)) {
    tags.push("pickleball", "athletic", "tennis");
  }

  tags.push(...matchKeywords(text, ACTIVITY_KEYWORDS));
  tags.push(...matchKeywords(text, REGION_KEYWORDS));
  tags.push(...matchKeywords(text, VIBE_KEYWORDS));

  return unique(tags);
}

export function optionMatchesLookTags(
  part: AnyCharacterLookPart,
  option: CharacterLookOption,
  required: readonly string[],
) {
  if (!required.length) return true;
  const have = new Set(lookOptionTags(part, option));
  return required.every((tag) => have.has(tag.trim().toLowerCase()));
}

/** Tag chips that actually appear on options for a part (keeps the filter row short). */
export function availableLookFilterTags(
  part: CharacterWardrobePart,
  options: readonly CharacterLookOption[],
): LookFilterTag[] {
  const present = new Set<string>();
  for (const option of options) {
    for (const tag of lookOptionTags(part, option)) present.add(tag);
  }
  return LOOK_FILTER_TAGS.filter((tag) => present.has(tag));
}
