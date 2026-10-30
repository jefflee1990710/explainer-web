// Finer wardrobe cuts (jeans, mini skirt, bob…) so the outfit picker can be filtered
// by garment shape. Style tabs stay extreme / stylized / classic.
import type { AnyCharacterLookPart, CharacterLookOption } from "@/service/character/character-look";

export const HAIR_SILHOUETTES = [
  "bob",
  "long",
  "waves",
  "curls",
  "bangs",
  "braid",
  "updo",
  "pony",
  "bun",
  "crop",
] as const;

export const TOP_SILHOUETTES = [
  "tee",
  "shirt",
  "knit",
  "hoodie",
  "blazer",
  "jacket",
  "coat",
  "tank",
  "dress",
  "polo",
] as const;

export const PANTS_SILHOUETTES = [
  "jeans",
  "mini",
  "midi",
  "maxi",
  "shorts",
  "cargo",
  "legging",
  "trouser",
  "wide",
  "skort",
] as const;

export const SHOE_SILHOUETTES = ["sneaker", "boot", "heel", "sandal", "loafer", "flat"] as const;

export type HairSilhouette = (typeof HAIR_SILHOUETTES)[number];
export type TopSilhouette = (typeof TOP_SILHOUETTES)[number];
export type PantsSilhouette = (typeof PANTS_SILHOUETTES)[number];
export type ShoeSilhouette = (typeof SHOE_SILHOUETTES)[number];

const KINDS: Partial<Record<AnyCharacterLookPart, readonly string[]>> = {
  hair: HAIR_SILHOUETTES,
  top: TOP_SILHOUETTES,
  pants: PANTS_SILHOUETTES,
  shoes: SHOE_SILHOUETTES,
};

// Chip order for one wardrobe part. Empty for face, body, expression, and accessory.
export function silhouettesForPart(part: AnyCharacterLookPart): readonly string[] {
  return KINDS[part] ?? [];
}

type LookSilhouetteInput = Pick<CharacterLookOption, "id" | "prompt"> &
  Partial<Pick<CharacterLookOption, "description" | "silhouette">>;

// Explicit catalog field wins. Older options are classified from id + prompt.
export function lookSilhouette(part: AnyCharacterLookPart, option: LookSilhouetteInput): string | null {
  const explicit = option.silhouette?.trim();
  if (explicit) return explicit;
  const text = `${option.id} ${option.prompt} ${option.description ?? ""}`;
  switch (part) {
    case "hair":
      return inferHair(text);
    case "top":
      return inferTop(text);
    case "pants":
      return inferPants(text);
    case "shoes":
      return inferShoes(text);
    default:
      return null;
  }
}

// Keep only options of one cut. "all" leaves the list unchanged.
export function filterOptionsBySilhouette<T extends { silhouette: string | null }>(
  options: readonly T[],
  kind: string,
): T[] {
  if (kind === "all") return [...options];
  return options.filter((option) => option.silhouette === kind);
}

function inferPants(text: string): PantsSilhouette | null {
  const t = text.toLowerCase();
  if (/\bskorts?\b/.test(t)) return "skort";
  // Skirts before pants words so a denim skirt is not filed under jeans.
  if (/\bskirts?\b|\bkilt\b|\blehenga\b|\bchima\b|\bpollera\b/.test(t)) {
    if (/\bmini\b|tennis skirt|high on the thigh|upper thigh/.test(t)) return "mini";
    if (/\bmaxi\b|to the floor|floor-length|ankle-grazing/.test(t)) return "maxi";
    return "midi";
  }
  if (/\bshorts\b|\bbermudas\b|\bbloomers\b|\bplus fours\b|\bbreeches\b/.test(t)) return "shorts";
  if (/\bcargo\b/.test(t)) return "cargo";
  if (/\bleggings?\b/.test(t)) return "legging";
  if (/\bjeans?\b|jeans/.test(t)) return "jeans";
  if (/\bwide[ -]?leg\b|\bpalazzo\b|\bculottes\b|\bharem\b/.test(t)) return "wide";
  if (/\btrousers?\b|\bchinos?\b|\bsweatpants\b|\bjoggers?\b|\btrack pants\b/.test(t)) return "trouser";
  return null;
}

function inferHair(text: string): HairSilhouette | null {
  const t = text.toLowerCase();
  // Fringe before length, so a long cut with bangs stays in the bangs chip.
  if (/\bbangs?\b|\bfringe\b|\bhime\b/.test(t)) return "bangs";
  if (/\bbraids?\b|\bplait\b|\bcornrows?\b|\bdreadlocks?\b/.test(t)) return "braid";
  if (/\bbuns?\b|\bchignon\b|\btop\s?knots?\b|\bspace buns\b/.test(t)) return "bun";
  if (/\bponytails?\b|\bpony tail\b/.test(t)) return "pony";
  if (/\bupdos?\b|\bfrench twist\b|\bbeehive\b|\bvictory rolls\b/.test(t)) return "updo";
  if (/\bbob\b/.test(t)) return "bob";
  if (/\bpixie\b|\bcrop(?:ped)?\b|\bbuzz\b|\bfade\b/.test(t)) return "crop";
  if (/\bcurls?\b|\bcoils?\b|\bafro\b/.test(t)) return "curls";
  if (/\bwaves?\b/.test(t)) return "waves";
  if (/\blong\b/.test(t)) return "long";
  return null;
}

function inferTop(text: string): TopSilhouette | null {
  const t = text.toLowerCase();
  if (/\bdress\b/.test(t)) return "dress";
  if (/\bhoodies?\b|\bsweatshirts?\b/.test(t)) return "hoodie";
  if (/\bpolos?\b/.test(t)) return "polo";
  if (/\bblazers?\b/.test(t)) return "blazer";
  if (/\bcoats?\b|\btrench\b|\bparkas?\b|\bcapes?\b|\bpeacoat\b/.test(t)) return "coat";
  if (/\bjackets?\b|\bbombers?\b/.test(t)) return "jacket";
  if (/\btanks?\b|\bcamisoles?\b|\bhalters?\b|\bbustiers?\b/.test(t)) return "tank";
  if (/\btees?\b|\bt-shirts?\b/.test(t)) return "tee";
  if (/\bshirts?\b|\boxford\b|\bblouses?\b|\bhenleys?\b/.test(t)) return "shirt";
  if (/\bknits?\b|\bsweaters?\b|\bcardigans?\b|\bturtlenecks?\b|\bcashmere\b/.test(t)) return "knit";
  return null;
}

function inferShoes(text: string): ShoeSilhouette | null {
  const t = text.toLowerCase();
  if (/\bsneakers?\b|\btrainers?\b|\brunners?\b|\bhightops?\b|\brunning shoes?\b|\bcourt shoes?\b/.test(t)) {
    return "sneaker";
  }
  if (/\bboots?\b|\bchelseas?\b|\bcombats?\b|\bwellingtons?\b|\bchukkas?\b/.test(t)) return "boot";
  if (/\bheels?\b|\bpumps?\b|\bslingbacks?\b|\bkittens?\b|\bmules?\b/.test(t)) return "heel";
  if (/\bsandals?\b|\bflip-?flops?\b|\bslides?\b|\bgeta\b|\bzori\b|\bgladiators?\b/.test(t)) return "sandal";
  if (/\bloafers?\b|\bhuaraches?\b|\bmoccasins?\b|\bboat shoes?\b/.test(t)) return "loafer";
  if (/\bflats?\b|\bballet\b|\bespadrilles?\b/.test(t)) return "flat";
  return null;
}
