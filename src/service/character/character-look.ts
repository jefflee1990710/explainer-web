// Picture picks for the character generator. Prompts stay in English for image generation.
import { REALISTIC_CHARACTER_RENDER_RULE } from "@/service/style/realistic-light";
import {
  wardrobePromptWithColor,
  type CharacterWardrobeColorPicks,
} from "@/service/character/wardrobe-colors";
import {
  EXTRA_ACCESSORIES,
  EXTRA_HAIR,
  EXTRA_HERITAGE_ACCESSORY_IDS,
  EXTRA_HERITAGE_HAIR_IDS,
  EXTRA_HERITAGE_PANTS_IDS,
  EXTRA_HERITAGE_SHOES_IDS,
  EXTRA_HERITAGE_TOP_IDS,
  EXTRA_PANTS,
  EXTRA_SHOES,
  EXTRA_STYLIZED_ACCESSORY_IDS,
  EXTRA_STYLIZED_HAIR_IDS,
  EXTRA_STYLIZED_PANTS_IDS,
  EXTRA_STYLIZED_SHOES_IDS,
  EXTRA_STYLIZED_TOP_IDS,
  EXTRA_TOPS,
} from "@/service/character/character-wardrobe-extra";
import { SILHOUETTE_DRESS_IDS } from "@/service/character/silhouette-catalog";

export const CHARACTER_LOOK_PARTS = ["hair", "face", "body", "pants", "shoes"] as const;
export const CHARACTER_EXTRA_PARTS = ["top", "accessory", "expression"] as const;
export const ALL_CHARACTER_LOOK_PARTS = [
  ...CHARACTER_LOOK_PARTS,
  ...CHARACTER_EXTRA_PARTS,
] as const;
export const CHARACTER_WARDROBE_PARTS = ["hair", "top", "pants", "shoes", "accessory"] as const;

export type CharacterLookPart = (typeof CHARACTER_LOOK_PARTS)[number];
export type CharacterExtraPart = (typeof CHARACTER_EXTRA_PARTS)[number];
export type AnyCharacterLookPart = (typeof ALL_CHARACTER_LOOK_PARTS)[number];
export type CharacterWardrobePart = (typeof CHARACTER_WARDROBE_PARTS)[number];
export type CharacterWardrobePicks = Partial<Record<CharacterWardrobePart, string>>;

export type CharacterGender = "female" | "male";
export type CharacterExaggerationLevel = "1x" | "3x" | "10x";
export type CharacterLookCategory = "all" | "extreme" | "stylized" | "classic";

export type CharacterLookOption = {
  id: string;
  /** English fragment sent to the image model. */
  prompt: string;
  /** Short searchable description; defaults to `prompt` when omitted. */
  description?: string;
  /** Free-form + controlled tags for UI filters and MCP search. */
  tags?: readonly string[];
  /** Garment or haircut family, e.g. jeans, mini, bob. Used by the outfit picker. */
  silhouette?: string;
};

export const CHARACTER_EXTRA_LOOKS: Record<CharacterExtraPart, readonly CharacterLookOption[]> = {
  top: [
    // Classic Essentials
    { id: "tee", prompt: "a fitted heavyweight crew-neck t-shirt" },
    { id: "hoodie", prompt: "a structured oversized streetwear hoodie" },
    { id: "blazer", prompt: "a sharp tailored double-breasted wool blazer" },
    // Multi-Era & Modern Subculture (1950s–2020s)
    { id: "varsity", prompt: "a 1950s American Ivy League wool-and-leather varsity letterman jacket" },
    { id: "parisian", prompt: "a 1960s Parisian Left Bank structured bouclé tweed cropped jacket" },
    { id: "leather80s", prompt: "a 1980s vintage black leather asymmetric biker jacket" },
    { id: "seoulminimal", prompt: "a 2020s Seoul K-fashion oversized minimalist charcoal wool blazer layered over a clean knit" },
    { id: "oldmoney", prompt: "a 2020s Quiet Luxury cream cashmere cable-knit polo sweater" },
    { id: "techwear", prompt: "a Berlin all-black utilitarian Gorpcore technical shell jacket with matte waterproof zips" },
    // Global 20 Most Populous Countries — Heritage to Modern Editorial Fashion
    { id: "neochinese", prompt: "a 2020s Neo-Chinese modern tailored black silk-jacquard stand-collar jacket with minimalist tonal frog buttons" },
    { id: "shanghai30s", prompt: "a 1930s Shanghai vintage tailored velvet mandarin-collar Tangzhuang jacket with satin piping" },
    { id: "bandhgala", prompt: "an Indian royal tailored Bandhgala stand-collar structured prince coat in deep midnight navy" },
    { id: "batik", prompt: "a contemporary Indonesian tailored resort shirt with intricate modern geometric Batik motifs" },
    { id: "sherwani", prompt: "a modern Pakistani tailored short Sherwani waistcoat layered over a crisp monochrome kurta tunic" },
    { id: "ankara", prompt: "a Lagos Afro-luxe tailored structured jacket in bold contemporary Ankara geometric wax-print" },
    { id: "ipanema", prompt: "a 1970s Rio Ipanema relaxed tropical open-collar linen resort blazer" },
    { id: "jamdani", prompt: "a minimalist Dhaka heritage handloom Jamdani woven cotton-silk tunic shirt with subtle geometric weave" },
    { id: "avanttrench", prompt: "a post-Soviet constructivist oversized double-breasted architectural trench coat" },
    { id: "habesha", prompt: "a modern Addis Ababa tailored off-white handwoven cotton jacket with traditional Ethiopian Tibeb geometric border trim" },
    { id: "guayabera", prompt: "a 1960s Acapulco modernist pleated linen Guayabera four-pocket resort shirt" },
    { id: "noragi", prompt: "a Tokyo contemporary indigo-dyed sashiko denim Noragi kimono-collar work jacket" },
    { id: "cairo", prompt: "a modern Cairo luxury sand-toned Egyptian-cotton belted safari shirt-jacket" },
    { id: "barong", prompt: "a contemporary Manila sheer-woven piña-organza Barong Tagalog overshirt with tonal geometric embroidery layered over a clean undershirt" },
    { id: "sapeur", prompt: "a Congolese La Sape dandy tailored vibrant double-breasted suit jacket with a crisp silk pocket square" },
    { id: "aodai", prompt: "a modern Saigon high-slit tailored Áo Dài tunic blazer with a minimalist stand collar" },
    { id: "manteau", prompt: "a Tehran contemporary long tailored open-front Manteau coat with subtle Persian Termeh brocade trim" },
    { id: "anatolian", prompt: "an Istanbul modern tailored espresso suede-and-shearling aviator jacket" },
    { id: "thaisilk", prompt: "a Bangkok contemporary structured iridescent Thai-silk boxy cropped jacket" },
    ...EXTRA_TOPS,
  ],
  accessory: [
    { id: "none", prompt: "no accessories, bare head and hands" },
    { id: "eyewear", prompt: "sleek vintage tortoiseshell optical glasses" },
    { id: "aviators", prompt: "1970s gold-wire amber-tinted aviator sunglasses" },
    { id: "cybervisors", prompt: "2000s Y2K rimless metallic shield sunglasses" },
    { id: "headphones", prompt: "minimalist brushed-aluminum over-ear studio headphones worn around the neck" },
    { id: "beret", prompt: "a Parisian black wool beret tilted cleanly on the head" },
    { id: "silkscarf", prompt: "a 1960s Italian printed silk neck scarf knotted neatly at the collar" },
    { id: "pearlchain", prompt: "a modern unisex minimalist silver-and-pearl layered neck chain" },
    ...EXTRA_ACCESSORIES,
  ],
  expression: [
    { id: "neutral", prompt: "calm composed editorial gaze looking straight into the lens" },
    { id: "smirk", prompt: "a confident charismatic half-smile with one eyebrow subtly raised" },
    { id: "warm", prompt: "a warm approachable creator smile with bright engaged eyes" },
    { id: "cool", prompt: "an effortless high-fashion model gaze with a relaxed jaw and composed posture" },
    { id: "focused", prompt: "a sharp articulate founder expression speaking with conviction" },
  ],
};

export const CHARACTER_LOOKS: Record<CharacterLookPart, readonly CharacterLookOption[]> = {
  hair: [
    { id: "none", prompt: "clean bald head, no hair" },
    { id: "bob", prompt: "chin-length straight bob with a centre part" },
    { id: "long", prompt: "long straight hair past the shoulders" },
    { id: "curly", prompt: "short tight curls" },
    { id: "bun", prompt: "hair pulled into a round top bun" },
    { id: "crop", prompt: "very short cropped hair" },
    { id: "waves", prompt: "1920s finger waves: short hair sculpted into shiny S-shaped waves tight against the scalp" },
    { id: "rolls", prompt: "1950s victory rolls: two large rolled curls sitting above the forehead, the rest pinned up" },
    { id: "beehive", prompt: "1960s beehive: one tall smooth cone of teased hair rising well above the head" },
    { id: "feathered", prompt: "1970s feathered hair: shoulder-length layers flipped outward at the ends" },
    { id: "mullet", prompt: "1980s mullet in three-quarter view: short hair on the top and sides, long hair down the back" },
    { id: "wolf", prompt: "2020s wolf cut: shaggy chopped layers with curtain bangs, shorter at the chin and longer toward the back" },
    { id: "hime", prompt: "Japanese hime cut: blunt straight bangs, long straight locks framing both cheeks, and the rest long and straight past the shoulders" },
    { id: "korean", prompt: "Korean see-through bangs: wispy bangs and soft face-framing layers ending at the shoulders" },
    { id: "afro", prompt: "a large rounded natural afro of dense coils, clearly wider than the head" },
    { id: "braids", prompt: "long thin box braids starting in a neat grid at the scalp and falling past the shoulders" },
    { id: "chignon", prompt: "three-quarter view turned slightly away so the nape is visible. Exactly one smooth round bun sits in the center of the nape. Side hair is pulled flat into that single bun. Only one bun, not a bun beside each ear" },
    { id: "plait", prompt: "one thick three-strand braid resting on the front of one shoulder, centre part, the rest of the hair gathered into that braid" },
    ...EXTRA_HAIR,
  ],
  face: [
    { id: "round", prompt: "round face with soft cheeks" },
    { id: "oval", prompt: "oval face with balanced proportions" },
    { id: "square", prompt: "square jaw and a broad forehead" },
    { id: "heart", prompt: "heart-shaped face, wider forehead, narrow chin" },
    { id: "monolid", prompt: "smooth monolid eyes with no eyelid crease" },
    { id: "doe", prompt: "very large round eyes with a clear double eyelid" },
    { id: "brows", prompt: "thick straight dark eyebrows" },
    { id: "ears", prompt: "ears that stick straight out from the sides of the head" },
    { id: "button", prompt: "a small rounded button nose" },
    { id: "aquiline", prompt: "a high straight nose bridge" },
    { id: "full", prompt: "full rounded lips" },
    { id: "thin", prompt: "very thin lips" },
    { id: "east", prompt: "East Asian features: light warm skin, smooth monolid eyes, straight brows, a low soft nose bridge, and medium lips" },
    { id: "japan", prompt: "Japanese features: fair skin, a soft oval face, gentle double eyelids, a small narrow nose, and a small mouth" },
    { id: "korea", prompt: "Korean features: fair skin, a sharp V-shaped jaw, defined double eyelids, a straight small nose, and softly full lips" },
    { id: "south", prompt: "South Asian features: warm medium-brown skin, large dark eyes, thick arched brows, a straight nose, and full lips" },
    { id: "sea", prompt: "Southeast Asian features: warm tan skin, soft double eyelids, a short rounded nose, and full lips" },
    { id: "africa", prompt: "West African features: deep brown skin, dark brown eyes, a broad nose, full lips, and a rounded forehead" },
    { id: "europe", prompt: "Northern European features: fair skin, light eyes, a high narrow nose, and thinner lips" },
    { id: "usa", prompt: "American features: light skin, double eyelids, a straight medium nose, a defined jaw, and medium lips" },
    { id: "latin", prompt: "Latin American features: warm olive skin, dark eyes, a softly rounded nose, and full lips" },
    { id: "mideast", prompt: "Middle Eastern features: olive skin, thick dark brows, large dark eyes, a prominent nose bridge, and medium lips" },
  ],
  body: [
    { id: "slim", prompt: "slim build" },
    { id: "average", prompt: "average build" },
    { id: "broad", prompt: "broad shoulders and a sturdy build" },
    { id: "petite", prompt: "short petite build" },
    { id: "tall", prompt: "a tall model-proportioned adult with long legs and an upright posture" },
    { id: "woman", prompt: "an adult woman with a feminine waist and hips" },
    { id: "man", prompt: "an adult man with a broader chest and narrower hips" },
    { id: "hourglass", prompt: "an hourglass figure, full hips and chest with a narrow waist" },
    { id: "athletic", prompt: "a lean athletic build with visible muscle tone but not bulky" },
  ],
  pants: [
    // "None": skipped under a one-piece top, otherwise drawn as plain short black pants.
    { id: "none", prompt: "skinny black short pants, fitted and ending at mid-thigh" },
    { id: "jeans", prompt: "straight blue jeans" },
    { id: "chinos", prompt: "tailored beige chinos" },
    { id: "shorts", prompt: "knee-length shorts" },
    { id: "sweatpants", prompt: "relaxed heather-grey loopback sweatpants" },
    { id: "cargo", prompt: "olive cargo pants with large flap pockets on the thighs" },
    { id: "wide", prompt: "draped high-waisted wide-leg trousers" },
    { id: "leggings", prompt: "sleek matte black athletic leggings" },
    { id: "suit", prompt: "tailored dark navy suit trousers with a sharp center crease" },
    { id: "pleated", prompt: "1950s Italian high-waisted tailored double-pleated wide wool trousers" },
    { id: "bells", prompt: "1970s vintage flare bell-bottom denim jeans" },
    { id: "baggy", prompt: "1990s NYC streetwear relaxed baggy denim jeans" },
    { id: "techcargo", prompt: "2020s articulated matte black technical nylon Gorpcore cargo pants" },
    { id: "hakama", prompt: "Japanese hakama, wide pleated architectural trousers" },
    { id: "salwar", prompt: "South Asian tailored tapered salwar trousers" },
    { id: "lederhosen", prompt: "German heritage brown suede leather trousers with tailored seams" },
    { id: "baji", prompt: "Korean modern hanbok baji wide-cut tapered trousers" },
    ...EXTRA_PANTS,
  ],
  shoes: [
    { id: "none", prompt: "barefoot, no shoes" },
    { id: "sneakers", prompt: "white sneakers" },
    { id: "boots", prompt: "dark ankle boots" },
    { id: "loafers", prompt: "brown leather penny loafers" },
    { id: "sandals", prompt: "open sandals" },
    { id: "heels", prompt: "sleek black pointed-toe high-heeled pumps" },
    { id: "oxfords", prompt: "polished black leather oxford dress shoes" },
    { id: "slippers", prompt: "minimalist suede mules" },
    { id: "platforms", prompt: "1970s sculptural thick-sole platform shoes" },
    { id: "tstrap", prompt: "1920s Art Deco T-strap leather heels" },
    { id: "chelsea", prompt: "1960s London sleek black leather Chelsea ankle boots" },
    { id: "hightops", prompt: "1980s retro leather-and-canvas high-top basketball sneakers" },
    { id: "chunky", prompt: "2020s luxury architectural chunky-sole runner sneakers" },
    { id: "geta", prompt: "Japanese wooden geta sandals with fabric straps" },
    { id: "tabi", prompt: "Tokyo avant-garde split-toe black leather Tabi ankle boots" },
    { id: "cowboy", prompt: "American heritage stitched leather western cowboy boots" },
    { id: "clogs", prompt: "European sculptural wooden-sole leather clogs" },
    { id: "brogues", prompt: "British and Congolese Sapeur two-tone perforated wingtip leather brogues" },
    { id: "peshawari", prompt: "Pakistani handcrafted double-strap braided leather Peshawari chappal sandals" },
    { id: "huarache", prompt: "Mexican artisanal hand-woven cognac leather Huarache loafers" },
    ...EXTRA_SHOES,
  ],
};

export type CharacterLookSelection = Record<CharacterLookPart, string> &
  Partial<Record<CharacterExtraPart, string>> & {
    gender?: CharacterGender;
    exaggeration?: CharacterExaggerationLevel;
    /** Optional hex overrides for wardrobe parts at blueprint creation. */
    wardrobeColors?: CharacterWardrobeColorPicks;
  };

export type { CharacterWardrobeColorPicks } from "@/service/character/wardrobe-colors";

const PART_LABEL: Record<AnyCharacterLookPart, string> = {
  hair: "Hair",
  face: "Face",
  body: "Body",
  top: "Top",
  pants: "Pants",
  shoes: "Shoes",
  accessory: "Accessory",
  expression: "Expression",
};

export function defaultCharacterLook(): CharacterLookSelection {
  return {
    gender: "female",
    hair: "bob",
    face: CHARACTER_LOOKS.face[0].id,
    body: CHARACTER_LOOKS.body[0].id,
    pants: "jeans",
    shoes: "sneakers",
    top: CHARACTER_EXTRA_LOOKS.top[0].id,
    accessory: CHARACTER_EXTRA_LOOKS.accessory[0].id,
    expression: CHARACTER_EXTRA_LOOKS.expression[0].id,
    exaggeration: "1x",
  };
}

export function optionsForLookPart(part: AnyCharacterLookPart): readonly CharacterLookOption[] {
  if (part in CHARACTER_LOOKS) {
    return CHARACTER_LOOKS[part as CharacterLookPart];
  }
  return CHARACTER_EXTRA_LOOKS[part as CharacterExtraPart];
}

export function isCharacterLookId(part: AnyCharacterLookPart, id: string) {
  return optionsForLookPart(part).some((option) => option.id === id);
}

export function characterLookOption(part: AnyCharacterLookPart, id: string) {
  return optionsForLookPart(part).find((option) => option.id === id);
}

// Public file for the studio preview of one option.
export function characterLookPreviewSrc(part: AnyCharacterLookPart, id: string) {
  if (!isCharacterLookId(part, id)) return "";
  // "None" has no photo; the picker shows the plain part glyph instead.
  if (id === NO_PANTS_ID) return "";
  return `/character-looks/${part}-${id}.webp?v=6`;
}

export const NO_PANTS_ID = "none";

// One-piece tops (dresses, robes, long gowns) already cover the legs, so they need no pants.
const FULL_BODY_TOP = new Set([
  "alredscoopdress",
  "alsportyjerseytop",
  "alsmokyqipaotop",
  "alinkbambooqipao",
  "vcnavybuttondress",
  "sptennisdress",
  "sppeekaboodress",
  "kaftan",
  "djellaba",
  "thobe",
  "galabeya",
  "abaya",
  "deel",
  "chuba",
  "gho",
  "changshan",
  // Catalogue dresses are one piece, so they do not also ask for pants.
  ...SILHOUETTE_DRESS_IDS,
]);

export function isFullBodyTop(topId?: string) {
  return Boolean(topId && FULL_BODY_TOP.has(topId));
}

// Pants prompt for a pick; undefined means "say nothing about pants" (no pants under a one-piece top).
export function pantsPromptFor(pantsId: string | undefined, topId: string | undefined) {
  if (!pantsId) return undefined;
  if (pantsId === NO_PANTS_ID && isFullBodyTop(topId)) return undefined;
  return characterLookOption("pants", pantsId)?.prompt;
}

// Global 20-country cultural & regional signature fashion items (mapped to the "extreme" / Global Heritage tab).
const GLOBAL_HERITAGE_HAIR = new Set(["hime", "korean", "afro", "braids", "chignon", "plait", ...EXTRA_HERITAGE_HAIR_IDS]);
const ERA_STYLIZED_HAIR = new Set(["waves", "rolls", "beehive", "feathered", "mullet", "wolf", ...EXTRA_STYLIZED_HAIR_IDS]);
const FULL_HAIR = new Set([...GLOBAL_HERITAGE_HAIR, ...ERA_STYLIZED_HAIR]);

const FEATURE_FACE = new Set(["monolid", "doe", "brows", "ears", "button", "aquiline", "full", "thin"]);
const REGION_FACE = new Set(["east", "japan", "korea", "south", "sea", "africa", "europe", "usa", "latin", "mideast"]);

const VARIETY_BODY = new Set(["tall", "woman", "man", "hourglass", "athletic"]);

const GLOBAL_HERITAGE_TOP = new Set([
  "neochinese",
  "shanghai30s",
  "bandhgala",
  "batik",
  "sherwani",
  "ankara",
  "ipanema",
  "jamdani",
  "avanttrench",
  "habesha",
  "guayabera",
  "noragi",
  "cairo",
  "barong",
  "sapeur",
  "aodai",
  "manteau",
  "anatolian",
  "thaisilk",
  ...EXTRA_HERITAGE_TOP_IDS,
]);
const ERA_STYLIZED_TOP = new Set([
  "hoodie",
  "varsity",
  "parisian",
  "leather80s",
  "seoulminimal",
  "oldmoney",
  "techwear",
  ...EXTRA_STYLIZED_TOP_IDS,
]);

const GLOBAL_HERITAGE_PANTS = new Set(["hakama", "salwar", "lederhosen", "baji", ...EXTRA_HERITAGE_PANTS_IDS]);
const ERA_STYLIZED_PANTS = new Set(["pleated", "bells", "baggy", "techcargo", ...EXTRA_STYLIZED_PANTS_IDS]);

const GLOBAL_HERITAGE_SHOES = new Set([
  "geta",
  "tabi",
  "cowboy",
  "clogs",
  "brogues",
  "peshawari",
  "huarache",
  ...EXTRA_HERITAGE_SHOES_IDS,
]);
const ERA_STYLIZED_SHOES = new Set([
  "platforms",
  "tstrap",
  "chelsea",
  "hightops",
  "chunky",
  ...EXTRA_STYLIZED_SHOES_IDS,
]);

const GLOBAL_HERITAGE_ACCESSORY = new Set(["beret", "silkscarf", "pearlchain", ...EXTRA_HERITAGE_ACCESSORY_IDS]);
const ERA_STYLIZED_ACCESSORY = new Set([
  "eyewear",
  "aviators",
  "cybervisors",
  "headphones",
  ...EXTRA_STYLIZED_ACCESSORY_IDS,
]);

const EDITORIAL_EXPRESSION = new Set(["cool", "focused"]);
const STYLIZED_EXPRESSION = new Set(["smirk", "warm"]);

// Identifies Global 20-Country / Runway signature options (displayed under the first highlight tab & badge).
export function isExaggeratedLookOption(part: AnyCharacterLookPart, id: string): boolean {
  switch (part) {
    case "hair":
      return GLOBAL_HERITAGE_HAIR.has(id);
    case "face":
      return REGION_FACE.has(id);
    case "body":
      return id === "tall" || id === "athletic" || id === "hourglass";
    case "top":
      return GLOBAL_HERITAGE_TOP.has(id);
    case "pants":
      return GLOBAL_HERITAGE_PANTS.has(id);
    case "shoes":
      return GLOBAL_HERITAGE_SHOES.has(id);
    case "accessory":
      return GLOBAL_HERITAGE_ACCESSORY.has(id);
    case "expression":
      return EDITORIAL_EXPRESSION.has(id);
  }
}

export function lookOptionCategory(part: AnyCharacterLookPart, id: string): Exclude<CharacterLookCategory, "all"> {
  if (isExaggeratedLookOption(part, id)) return "extreme";
  if (
    (part === "hair" && ERA_STYLIZED_HAIR.has(id)) ||
    (part === "face" && FEATURE_FACE.has(id)) ||
    (part === "body" && VARIETY_BODY.has(id)) ||
    (part === "top" && ERA_STYLIZED_TOP.has(id)) ||
    (part === "pants" && ERA_STYLIZED_PANTS.has(id)) ||
    (part === "shoes" && ERA_STYLIZED_SHOES.has(id)) ||
    (part === "accessory" && ERA_STYLIZED_ACCESSORY.has(id)) ||
    (part === "expression" && STYLIZED_EXPRESSION.has(id))
  ) {
    return "stylized";
  }
  return "classic";
}

export type ViralCharacterPreset = {
  id: string;
  selection: CharacterLookSelection;
};

export const CHARACTER_VIRAL_PRESETS: readonly ViralCharacterPreset[] = [
  {
    id: "skyscraperDiva",
    selection: {
      gender: "female",
      hair: "korean",
      face: "korea",
      body: "slim",
      top: "seoulminimal",
      pants: "wide",
      shoes: "chunky",
      accessory: "eyewear",
      expression: "warm",
      exaggeration: "3x",
    },
  },
  {
    id: "muscleTitan",
    selection: {
      gender: "male",
      hair: "wolf",
      face: "europe",
      body: "athletic",
      top: "techwear",
      pants: "techcargo",
      shoes: "boots",
      accessory: "headphones",
      expression: "cool",
      exaggeration: "3x",
    },
  },
  {
    id: "bugeyeHype",
    selection: {
      gender: "female",
      hair: "hime",
      face: "east",
      body: "slim",
      top: "neochinese",
      pants: "pleated",
      shoes: "tabi",
      accessory: "pearlchain",
      expression: "smirk",
      exaggeration: "3x",
    },
  },
  {
    id: "ramenGremlin",
    selection: {
      gender: "male",
      hair: "feathered",
      face: "usa",
      body: "average",
      top: "oldmoney",
      pants: "suit",
      shoes: "loafers",
      accessory: "aviators",
      expression: "focused",
      exaggeration: "3x",
    },
  },
];

export function randomizeCharacterLook(
  current: CharacterLookSelection,
  options: {
    locked?: Partial<Record<AnyCharacterLookPart, boolean>>;
    extremeOnly?: boolean;
    rand?: () => number;
  } = {},
): CharacterLookSelection {
  const rng = options.rand ?? Math.random;
  const next: CharacterLookSelection = {
    ...current,
    exaggeration: options.extremeOnly ? "10x" : current.exaggeration ?? "3x",
  };
  for (const part of ALL_CHARACTER_LOOK_PARTS) {
    if (options.locked?.[part]) continue;
    const all = optionsForLookPart(part).filter(
      (item) => !(item.id === NO_PANTS_ID && (part === "hair" || part === "pants" || part === "shoes")),
    );
    const pool = options.extremeOnly
      ? all.filter((item) => isExaggeratedLookOption(part, item.id))
      : all;
    const candidates = pool.length > 0 ? pool : all;
    const picked = candidates[Math.floor(rng() * candidates.length)] ?? candidates[0];
    if (picked) {
      (next as Record<string, string>)[part] = picked.id;
    }
  }
  // A random one-piece top drops the random pants.
  if (!options.locked?.pants && isFullBodyTop(next.top)) next.pants = NO_PANTS_ID;
  return next;
}

function bodyPreview(id: string, prompt: string) {
  if (VARIETY_BODY.has(id)) {
    return [
      "Subject: one full standing person, front view, arms at the sides, feet visible.",
      "Plain light grey t-shirt, dark navy pants, simple dark shoes. Neutral face, not the subject.",
      `The build must match exactly: ${prompt}.`,
      "Leave empty background where needed so the height or silhouette stays obvious. Do not zoom into a close crop.",
    ].join(" ");
  }
  return [
    "Subject: one full standing person, front view, arms at the sides, feet visible.",
    "Same plain outfit every time: light grey t-shirt, dark navy straight pants, simple dark shoes.",
    "Face is a simple neutral oval with short brown hair. Do not make the face the subject.",
    `Only the body build changes: ${prompt}.`,
    "The height and width of the body must be obvious.",
  ].join(" ");
}

function pantsPreview(_id: string, prompt: string) {
  return [
    "Subject: only the pants, front view, as if worn by an invisible figure, from waist to hem.",
    "No shirt, no shoes, no head, no hands.",
    `The garment is: ${prompt}.`,
    "Centered and large enough to tell apart from other pants.",
  ].join(" ");
}

function shoesPreview(_id: string, prompt: string) {
  return [
    "Subject: one pair of shoes, three-quarter view, both shoes visible, resting on the ground.",
    "No legs above the ankle, no person.",
    `The shoes are: ${prompt}.`,
    "Centered and large.",
  ].join(" ");
}

function facePreview(id: string, prompt: string) {
  if (REGION_FACE.has(id)) {
    return [
      "Subject: one head and neck, front view, facing the camera.",
      "Very short cropped hair so the face is the subject. Neutral expression, no glasses.",
      "Photorealistic features, not a costume and not a caricature.",
      `The face matches this description exactly: ${prompt}.`,
      "Crop at the base of the neck.",
    ].join(" ");
  }
  if (FEATURE_FACE.has(id)) {
    return [
      "Subject: one head and neck, front view, facing the camera.",
      "Same base every time: light warm skin, very short cropped brown hair, neutral expression, no glasses.",
      `Only this facial feature changes: ${prompt}.`,
      "That feature must be obvious. Do not change the face shape.",
      "Crop at the base of the neck.",
    ].join(" ");
  }
  return [
    "Subject: one head and neck, front view, facing the camera.",
    "Same hair every time: very short cropped brown hair, so the face outline is the subject.",
    "Light warm skin, neutral expression, no glasses.",
    `Only the face shape changes: ${prompt}.`,
    "The silhouette of the face must be obvious.",
    "Crop at the base of the neck.",
  ].join(" ");
}

const PREVIEW_FRAME = [
  "Photorealistic studio photograph, 1:1.",
  "Plain light grey seamless background.",
  "Centered subject, sharp focus, natural skin pores, peach-fuzz, hair, and fabric texture.",
  "Real photograph. Not an illustration, not a cartoon, not a drawing, not 3D.",
  "No text, no letters, no numbers, no watermark, no border.",
].join(" ");

// Isolated picture of one option, so the picker shows that part and nothing else.
export function characterLookPreviewPrompt(part: AnyCharacterLookPart, id: string) {
  const option = characterLookOption(part, id);
  if (!option) throw new Error(`Unknown ${part} look: ${id}`);
  const subject: Record<AnyCharacterLookPart, string> = {
    hair: FULL_HAIR.has(id)
      ? [
          "Subject: one person, facing the camera, light warm skin, round face, neutral expression, no glasses.",
          "Front view, unless the description asks for another angle.",
          `The hairstyle is the subject and must match exactly: ${option.prompt}.`,
          "Show the entire hairstyle, including hair piled on the head or hanging past the shoulders.",
          "Do not replace it with a plain loose haircut.",
          "Include only as much of the shoulders as needed to show the hair.",
        ].join(" ")
      : [
          "Subject: one head and neck, front view, facing the camera.",
          "Same person every time: light warm skin, round face, neutral expression, no glasses.",
          `Only the hair changes: ${option.prompt}.`,
          "The hairstyle must match the description exactly. Do not braid it, do not tie it, and do not change the length.",
          "Crop at the base of the neck. No shoulders, no clothes.",
        ].join(" "),
    face: facePreview(id, option.prompt),
    body: bodyPreview(id, option.prompt),
    top: [
      "Subject: only the upper-body top garment on an invisible mannequin, front view.",
      `The garment is: ${option.prompt}.`,
      "No head, no pants, no shoes. Centered and filling the frame with crisp fabric drape and tailoring detail.",
    ].join(" "),
    pants: pantsPreview(id, option.prompt),
    shoes: shoesPreview(id, option.prompt),
    accessory: [
      "Subject: one head and shoulders mannequin wearing the fashion accessory, front view.",
      `The fashion accessory is: ${option.prompt}.`,
      "Make the accessory clean, stylish, and unmistakable.",
    ].join(" "),
    expression: [
      "Subject: one head, front view, facing the camera, short hair.",
      `The facial expression is charismatic and editorial: ${option.prompt}.`,
      "Natural photorealistic camera presence.",
    ].join(" "),
  };
  return `${PREVIEW_FRAME} ${subject[part]}`;
}

const EXAGGERATION_PROMPT: Record<CharacterExaggerationLevel, string> = {
  "1x": "",
  "3x": "Styling vibe: Editorial Street Chic — sharp tailored silhouette, crisp fabric drape, confident creator posture, and magazine-ready lighting contrast.",
  "10x": "Styling vibe: High-Fashion Runway Campaign — bold luxury campaign presence, impeccable sartorial structure, and striking editorial charisma with natural human proportions.",
};

// One description for the blueprint. Every selected part is named so the image model keeps the combination.
function wardrobePartPromptLine(
  part: CharacterWardrobePart,
  optionId: string,
  basePrompt: string,
  colors?: CharacterWardrobeColorPicks,
  customPrompt?: string,
): string {
  const prompt = wardrobePromptWithColor(basePrompt, part, optionId, colors, customPrompt);
  return `${PART_LABEL[part]}: ${prompt}.`;
}

export function characterLookPrompt(selection: CharacterLookSelection) {
  const colors = selection.wardrobeColors;
  const lines: string[] = [];
  if (selection.gender === "male") {
    lines.push("Gender: adult man (male).");
  } else if (selection.gender === "female") {
    lines.push("Gender: adult woman (female).");
  }
  for (const part of CHARACTER_LOOK_PARTS) {
    const option = CHARACTER_LOOKS[part].find((item) => item.id === selection[part]);
    if (!option) throw new Error(`Unknown ${part} look: ${selection[part]}`);
    if (part === "pants") {
      const pants = pantsPromptFor(option.id, selection.top);
      if (pants) {
        lines.push(
          wardrobePartPromptLine("pants", option.id, pants, colors),
        );
      }
      continue;
    }
    if (part === "hair") {
      lines.push(wardrobePartPromptLine("hair", option.id, option.prompt, colors));
      continue;
    }
    if (part === "shoes") {
      lines.push(wardrobePartPromptLine("shoes", option.id, option.prompt, colors));
      continue;
    }
    lines.push(`${PART_LABEL[part]}: ${option.prompt}.`);
  }
  for (const part of CHARACTER_EXTRA_PARTS) {
    const id = selection[part];
    if (!id) continue;
    // Skip default neutral/none extras so legacy callers stay unchanged unless chosen.
    if ((part === "top" && id === "tee") || (part === "accessory" && id === "none") || (part === "expression" && id === "neutral")) {
      continue;
    }
    const option = CHARACTER_EXTRA_LOOKS[part].find((item) => item.id === id);
    if (option) {
      if (part === "top" || part === "accessory") {
        lines.push(wardrobePartPromptLine(part, id, option.prompt, colors));
      } else {
        lines.push(`${PART_LABEL[part]}: ${option.prompt}.`);
      }
    }
  }
  const ex = selection.exaggeration && selection.exaggeration !== "1x" ? EXAGGERATION_PROMPT[selection.exaggeration] : "";
  if (ex) lines.push(ex);
  lines.push(
    "Draw this exact combination on one character. Do not swap the hair, face shape, build, pants, or shoes.",
  );
  return lines.join("\n");
}

// One full-body portrait in a real-world environment that fits the character's look.
export function characterPoseSheetPrompt(selection: CharacterLookSelection) {
  return [
    "Photorealistic full-body portrait photograph of a single character, framed from head to shoes.",
    "Natural, confident full-body pose facing the camera, showing the entire person clearly from hair down to shoes.",
    "Set in a real-world environmental background with natural lighting and atmosphere that fits the outfit, era, and styling vibe of the character.",
    REALISTIC_CHARACTER_RENDER_RULE,
    "Single person only — do not draw multiple views, a grid, or an 8-pose sheet.",
    "No text, no labels, no watermark, no extra people.",
    characterLookPrompt(selection),
  ].join("\n");
}

// Edit the current full-body portrait from a user comment. Unmentioned details stay.
export function characterPoseRevisionPrompt(selection: CharacterLookSelection, comment: string) {
  return [
    "Edit the attached photorealistic full-body photograph.",
    "Change only what this comment asks. Keep the same person, clothes, background, framing, and pose the comment does not mention.",
    `Comment: ${comment.trim()}`,
    "Stay a single full-body real photograph with a fitting background. No text, no labels, no watermark.",
    "The person should still match this look, unless the comment changes it:",
    characterLookPrompt(selection),
  ].join("\n");
}

// Detect which wardrobe/hair option ids are currently worn, from a version prompt + editInstruction.
// The prompt keeps every past change in order, so the option mentioned last for a part is the one worn now.
export function detectCharacterWardrobePicks(text?: string): CharacterWardrobePicks {
  if (!text) return {};
  const picks: CharacterWardrobePicks = {};
  const foundAt: Partial<Record<CharacterWardrobePart, number>> = {};
  for (const part of CHARACTER_WARDROBE_PARTS) {
    let latestAt = -1;
    for (const option of optionsForLookPart(part)) {
      const at = text.lastIndexOf(`${PART_LABEL[part]}: ${option.prompt}`);
      if (at > latestAt) {
        latestAt = at;
        picks[part] = option.id;
      }
    }
    foundAt[part] = latestAt;
  }
  // A one-piece top put on after the last pants line means no pants are worn now.
  if (isFullBodyTop(picks.top) && (foundAt.top ?? -1) > (foundAt.pants ?? -1)) {
    picks.pants = NO_PANTS_ID;
  }
  return picks;
}

// Apply one picker choice. Picking a top also settles pants the user has not picked:
// a one-piece top sets "none", and a half top over current "none" keeps it (drawn as short black pants).
export function applyWardrobePick(
  prev: CharacterWardrobePicks,
  part: CharacterWardrobePart,
  id: string,
  worn: CharacterWardrobePicks,
): CharacterWardrobePicks {
  const next: CharacterWardrobePicks = { ...prev, [part]: id };
  if (part === "top" && !prev.pants && (isFullBodyTop(id) || worn.pants === NO_PANTS_ID)) {
    next.pants = NO_PANTS_ID;
  }
  return next;
}

// Drops unknown parts and option ids from client-sent wardrobe picks (allows custom `cw_<hex24>` ids).
export function sanitizeWardrobePicks(raw: unknown): CharacterWardrobePicks {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const picks: CharacterWardrobePicks = {};
  for (const part of CHARACTER_WARDROBE_PARTS) {
    const id = input[part];
    if (
      typeof id === "string" &&
      (isCharacterLookId(part, id) || /^cw_[a-f0-9]{24}$/i.test(id))
    ) {
      picks[part] = id;
    }
  }
  return picks;
}

// Picked wardrobe ids → English prompt text per part (supports customPromptMap for `cw_*` items).
export function wardrobePickPrompts(
  picks: CharacterWardrobePicks,
  customPromptMap?: ReadonlyMap<string, string>,
  colors?: CharacterWardrobeColorPicks,
): Partial<Record<CharacterWardrobePart, string>> {
  const prompts: Partial<Record<CharacterWardrobePart, string>> = {};
  for (const part of CHARACTER_WARDROBE_PARTS) {
    const id = picks[part];
    if (!id) continue;
    const customPrompt = customPromptMap?.get(id);
    const base =
      customPrompt ??
      (part === "pants"
        ? pantsPromptFor(id, picks.top)
        : characterLookOption(part, id)?.prompt);
    if (base) {
      prompts[part] = wardrobePromptWithColor(base, part, id, colors, customPrompt);
    }
  }
  return prompts;
}

// Compose an edit instruction from selected hair / top / pants / shoes / accessory + optional note.
// `wornTop` is the top already on the character, used when the top itself is not being changed.
export function characterWardrobeEditInstruction(
  picks: CharacterWardrobePicks,
  customNote = "",
  wornTop?: string,
  customPromptMap?: ReadonlyMap<string, string>,
  colors?: CharacterWardrobeColorPicks,
): string {
  const parts: string[] = [];
  for (const part of CHARACTER_WARDROBE_PARTS) {
    const id = picks[part];
    if (!id) continue;
    const customPrompt = customPromptMap?.get(id);
    const base =
      customPrompt ??
      (part === "pants"
        ? pantsPromptFor(id, picks.top ?? wornTop)
        : characterLookOption(part, id)?.prompt);
    if (base) {
      const prompt = wardrobePromptWithColor(base, part, id, colors, customPrompt);
      parts.push(`${PART_LABEL[part]}: ${prompt}`);
    }
  }
  const note = customNote.trim();
  if (note) parts.push(note);
  return parts.join("; ");
}
