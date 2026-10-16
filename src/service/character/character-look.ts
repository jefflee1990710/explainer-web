// Picture picks for the character generator. Prompts stay in English for GPT Image.

export const CHARACTER_LOOK_PARTS = ["hair", "face", "body", "pants", "shoes"] as const;
export const CHARACTER_EXTRA_PARTS = ["top", "accessory", "expression"] as const;
export const ALL_CHARACTER_LOOK_PARTS = [
  ...CHARACTER_LOOK_PARTS,
  ...CHARACTER_EXTRA_PARTS,
] as const;

export type CharacterLookPart = (typeof CHARACTER_LOOK_PARTS)[number];
export type CharacterExtraPart = (typeof CHARACTER_EXTRA_PARTS)[number];
export type AnyCharacterLookPart = (typeof ALL_CHARACTER_LOOK_PARTS)[number];

export type CharacterExaggerationLevel = "1x" | "3x" | "10x";
export type CharacterLookCategory = "all" | "extreme" | "stylized" | "classic";

export type CharacterLookOption = {
  id: string;
  prompt: string;
};

export const CHARACTER_EXTRA_LOOKS: Record<CharacterExtraPart, readonly CharacterLookOption[]> = {
  top: [
    { id: "tee", prompt: "a fitted coral red-orange crew-neck t-shirt" },
    { id: "hoodie", prompt: "an oversized streetwear hoodie in electric lime green" },
    { id: "blazer", prompt: "a sharp tailored double-breasted blazer" },
    { id: "puffer", prompt: "an impossibly huge inflated puffer jacket three times wider than the shoulders, like a giant lime-and-coral marshmallow" },
    { id: "disco", prompt: "a blinding holographic sequin disco jacket with giant pointed shoulder pads wider than the head" },
    { id: "fur", prompt: "an enormous neon monster faux-fur coat dragging on the floor" },
  ],
  accessory: [
    { id: "none", prompt: "no accessories, bare head and hands" },
    { id: "shades", prompt: "oversized neon lime shutter sunglasses twice as wide as the face" },
    { id: "crown", prompt: "a tilted giant golden crown sitting on top of the head" },
    { id: "fishbowl", prompt: "a transparent glass astronaut fishbowl helmet over the head with a tiny orange goldfish swimming inside" },
    { id: "ramen", prompt: "a steaming ceramic ramen bowl balanced precariously on top of the head with chopsticks floating in the noodles" },
    { id: "chain", prompt: "an absurdly thick cartoon-sized gold rope chain necklace with links as big as fists" },
  ],
  expression: [
    { id: "neutral", prompt: "calm neutral expression looking straight into the lens" },
    { id: "smirk", prompt: "a confident asymmetrical smirk with one eyebrow cocked high" },
    { id: "jawdrop", prompt: "an extreme jaw-dropped shock expression with the mouth wide open and eyes popping in disbelief" },
    { id: "eyeroll", prompt: "an exaggerated deadpan unimpressed eye-roll with half-lidded eyes" },
    { id: "grin", prompt: "a manic ear-to-ear viral villain grin showing all teeth with wide gleaming eyes" },
  ],
};

export const CHARACTER_LOOKS: Record<CharacterLookPart, readonly CharacterLookOption[]> = {
  hair: [
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
    { id: "tower", prompt: "a solid tower of hair rising straight up, three times taller than the head, like a skyscraper" },
    { id: "spikes", prompt: "dozens of long rigid hair spikes shooting out in every direction, wider than the shoulders" },
    { id: "cloud", prompt: "one enormous round cloud of hair, several times bigger than the head" },
    { id: "drills", prompt: "two giant horizontal corkscrew drills of hair, one sticking far out from each side of the head" },
    { id: "fountain", prompt: "hair blasting straight up then exploding outward like a fountain, filling the whole frame" },
    { id: "horns", prompt: "two huge smooth horns of hair, each longer than the head, curving up and outward" },
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
    { id: "bugeyes", prompt: "two eyes each as large as the mouth, bulging and round" },
    { id: "pin", prompt: "two tiny dot eyes, much smaller than the nostrils" },
    { id: "beak", prompt: "a nose longer than the whole face, sticking straight out toward the camera" },
    { id: "balloon", prompt: "lips larger than both cheeks, filling the lower half of the picture" },
    { id: "dumbo", prompt: "two ears each larger than the head, sticking out sideways" },
    { id: "stretch", prompt: "a face three times longer than it is wide, with the forehead and chin far apart" },
  ],
  body: [
    { id: "slim", prompt: "slim build" },
    { id: "average", prompt: "average build" },
    { id: "broad", prompt: "broad shoulders and a sturdy build" },
    { id: "petite", prompt: "short petite build" },
    { id: "short", prompt: "an extremely short adult, about half a normal height, standing in the lower half of the frame with empty space above the head" },
    { id: "tall", prompt: "an extremely tall adult whose head and feet touch the edges of the frame, with very long legs" },
    { id: "heavy", prompt: "a very fat body with a large round belly and thick arms and legs" },
    { id: "skinny", prompt: "an extremely skinny body, stick-thin arms and legs" },
    { id: "woman", prompt: "an adult woman with a feminine waist and hips" },
    { id: "man", prompt: "an adult man with a broader chest and narrower hips" },
    { id: "hourglass", prompt: "an hourglass figure, full hips and chest with a narrow waist" },
    { id: "athletic", prompt: "a lean athletic build with visible muscle but not bulky" },
    { id: "strong", prompt: "cartoon-strong muscles, each arm thicker than the waist, shoulders wider than two normal people" },
    { id: "giant", prompt: "a body almost as wide as it is tall, a huge round ball of a torso" },
    { id: "beanpole", prompt: "a body about ten times taller than it is wide, like a walking stick" },
    { id: "hulk", prompt: "muscles bigger than the head on the chest, arms, and thighs" },
    { id: "sumo", prompt: "a sumo wrestler body, enormous belly and thighs, very short legs" },
    { id: "corset", prompt: "a 1900s hourglass pulled to an impossible tiny waist, small enough to circle with two hands" },
    { id: "muscle", prompt: "a 1980s bodybuilder with balloon-sized muscles on every limb" },
    { id: "wedge", prompt: "an impossible inverted triangle man, shoulders wider than the torso is tall, waist thinner than his head" },
  ],
  pants: [
    { id: "jeans", prompt: "straight blue jeans" },
    { id: "chinos", prompt: "tailored beige chinos" },
    { id: "shorts", prompt: "knee-length shorts" },
    { id: "sweatpants", prompt: "loose grey sweatpants" },
    { id: "cargo", prompt: "olive cargo pants with large flap pockets on the thighs" },
    { id: "wide", prompt: "very wide-leg trousers that swing far out from the legs" },
    { id: "leggings", prompt: "tight black leggings" },
    { id: "suit", prompt: "tailored dark navy suit trousers with a crease" },
    { id: "bells", prompt: "1970s bell-bottom jeans, tight at the thigh and huge flares at the hem" },
    { id: "baggy", prompt: "1990s extremely baggy jeans pooling over the shoes" },
    { id: "hakama", prompt: "Japanese hakama, wide pleated traditional trousers" },
    { id: "salwar", prompt: "Indian salwar, loose trousers gathered at the ankle" },
    { id: "lederhosen", prompt: "German lederhosen, short brown leather pants with suspenders" },
    { id: "baji", prompt: "Korean hanbok baji, loose traditional pants tied at the ankle" },
    { id: "balloon", prompt: "pants so wide they are wider than the wearer is tall, a huge fabric ball" },
    { id: "puddle", prompt: "pants many times longer than the legs, piled in huge fabric pools on the floor" },
    { id: "micro", prompt: "shorts smaller than a hand, barely covering the top of the thighs" },
  ],
  shoes: [
    { id: "sneakers", prompt: "white sneakers" },
    { id: "boots", prompt: "dark ankle boots" },
    { id: "loafers", prompt: "brown leather loafers" },
    { id: "sandals", prompt: "open sandals" },
    { id: "heels", prompt: "black high-heeled pumps" },
    { id: "oxfords", prompt: "black leather oxford dress shoes" },
    { id: "slippers", prompt: "soft house slippers" },
    { id: "platforms", prompt: "thick platform shoes with a tall sole" },
    { id: "tstrap", prompt: "1920s T-strap heels with a strap down the front of the foot" },
    { id: "hightops", prompt: "1980s canvas high-top sneakers with a tall ankle collar" },
    { id: "geta", prompt: "Japanese wooden geta sandals with two teeth under the sole" },
    { id: "cowboy", prompt: "American cowboy boots with a pointed toe and a stacked heel" },
    { id: "clogs", prompt: "Dutch wooden clogs" },
    { id: "brogues", prompt: "British brogues with decorative perforations on the leather" },
    { id: "clown", prompt: "clown shoes longer than a person's legs, with huge round toes" },
    { id: "towers", prompt: "heels taller than the shoe is long, impossibly high spikes" },
    { id: "pebble", prompt: "a tiny pair of shoes the size of coins, surrounded by empty floor so they look miniature" },
  ],
};

export type CharacterLookSelection = Record<CharacterLookPart, string> &
  Partial<Record<CharacterExtraPart, string>> & {
    exaggeration?: CharacterExaggerationLevel;
  };

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
    hair: CHARACTER_LOOKS.hair[0].id,
    face: CHARACTER_LOOKS.face[0].id,
    body: CHARACTER_LOOKS.body[0].id,
    pants: CHARACTER_LOOKS.pants[0].id,
    shoes: CHARACTER_LOOKS.shoes[0].id,
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

// Public file for the Gemini preview of one option.
export function characterLookPreviewSrc(part: AnyCharacterLookPart, id: string) {
  if (!isCharacterLookId(part, id)) return "";
  return `/character-looks/${part}-${id}.webp?v=4`;
}

const EXAGGERATED_HAIR = new Set(["tower", "spikes", "cloud", "drills", "fountain", "horns"]);

// Era and regional cuts that are pinned, braided, or longer than a neck crop.
const FULL_HAIR = new Set([
  "waves",
  "rolls",
  "beehive",
  "feathered",
  "mullet",
  "wolf",
  "hime",
  "korean",
  "afro",
  "braids",
  "chignon",
  "plait",
]);

const FEATURE_FACE = new Set(["monolid", "doe", "brows", "ears", "button", "aquiline", "full", "thin"]);
const REGION_FACE = new Set(["east", "japan", "korea", "south", "sea", "africa", "europe", "usa", "latin", "mideast"]);
const EXAGGERATED_FACE = new Set(["bugeyes", "pin", "beak", "balloon", "dumbo", "stretch"]);

const VARIETY_BODY = new Set(["short", "tall", "heavy", "skinny", "woman", "man", "hourglass", "athletic"]);
const EXAGGERATED_BODY = new Set(["strong", "giant", "beanpole", "hulk", "sumo", "corset", "muscle", "wedge"]);
const EXAGGERATED_PANTS = new Set(["balloon", "puddle", "micro"]);
const EXAGGERATED_SHOES = new Set(["clown", "towers", "pebble"]);
const EXAGGERATED_TOP = new Set(["puffer", "disco", "fur"]);
const EXAGGERATED_ACCESSORY = new Set(["shades", "fishbowl", "ramen", "chain"]);
const EXAGGERATED_EXPRESSION = new Set(["jawdrop", "eyeroll", "grin"]);

export function isExaggeratedLookOption(part: AnyCharacterLookPart, id: string): boolean {
  switch (part) {
    case "hair":
      return EXAGGERATED_HAIR.has(id);
    case "face":
      return EXAGGERATED_FACE.has(id);
    case "body":
      return EXAGGERATED_BODY.has(id) || id === "short" || id === "tall";
    case "pants":
      return EXAGGERATED_PANTS.has(id);
    case "shoes":
      return EXAGGERATED_SHOES.has(id);
    case "top":
      return EXAGGERATED_TOP.has(id);
    case "accessory":
      return EXAGGERATED_ACCESSORY.has(id);
    case "expression":
      return EXAGGERATED_EXPRESSION.has(id);
  }
}

export function lookOptionCategory(part: AnyCharacterLookPart, id: string): Exclude<CharacterLookCategory, "all"> {
  if (isExaggeratedLookOption(part, id)) return "extreme";
  if (
    (part === "hair" && FULL_HAIR.has(id)) ||
    (part === "face" && (FEATURE_FACE.has(id) || REGION_FACE.has(id))) ||
    (part === "body" && VARIETY_BODY.has(id)) ||
    (part === "pants" && ["bells", "baggy", "hakama", "salwar", "lederhosen", "baji"].includes(id)) ||
    (part === "shoes" && ["platforms", "tstrap", "hightops", "geta", "cowboy", "clogs", "brogues"].includes(id)) ||
    (part === "top" && ["hoodie", "blazer"].includes(id)) ||
    (part === "accessory" && id === "crown") ||
    (part === "expression" && id === "smirk")
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
      hair: "tower",
      face: "balloon",
      body: "corset",
      top: "disco",
      pants: "bells",
      shoes: "towers",
      accessory: "shades",
      expression: "smirk",
      exaggeration: "10x",
    },
  },
  {
    id: "muscleTitan",
    selection: {
      hair: "spikes",
      face: "square",
      body: "wedge",
      top: "puffer",
      pants: "micro",
      shoes: "boots",
      accessory: "chain",
      expression: "grin",
      exaggeration: "10x",
    },
  },
  {
    id: "bugeyeHype",
    selection: {
      hair: "cloud",
      face: "bugeyes",
      body: "short",
      top: "hoodie",
      pants: "balloon",
      shoes: "clown",
      accessory: "fishbowl",
      expression: "jawdrop",
      exaggeration: "10x",
    },
  },
  {
    id: "ramenGremlin",
    selection: {
      hair: "horns",
      face: "dumbo",
      body: "beanpole",
      top: "fur",
      pants: "puddle",
      shoes: "pebble",
      accessory: "ramen",
      expression: "eyeroll",
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
    const all = optionsForLookPart(part);
    const pool = options.extremeOnly
      ? all.filter((item) => isExaggeratedLookOption(part, item.id))
      : all;
    const candidates = pool.length > 0 ? pool : all;
    const picked = candidates[Math.floor(rng() * candidates.length)] ?? candidates[0];
    if (picked) {
      (next as Record<string, string>)[part] = picked.id;
    }
  }
  return next;
}

// Body, pants, and shoes: ordinary options stay plain. Extremes must not be tamed.
function bodyPreview(id: string, prompt: string) {
  if (id === "wedge") {
    return [
      "Subject: one shirtless adult man, front view. The entire body from head to feet is visible.",
      "Dark pants. Exactly two arms of normal thickness hanging at his sides. No wings and no extra limbs.",
      `The body is physically impossible and extremely exaggerated: ${prompt}.`,
      "Do not tame it into a normal man. The shoulder-to-waist triangle fills the frame width.",
      "A real photograph of an impossible body, not a cartoon drawing.",
    ].join(" ");
  }
  if (EXAGGERATED_BODY.has(id)) {
    return [
      "Subject: one full standing person, front view, feet visible, arms hanging at the sides.",
      "Vibrant coral red-orange t-shirt and deep ink-black pants with electric lime trim.",
      `The body is physically impossible and extremely exaggerated: ${prompt}.`,
      "Do not tame it into a normal body.",
      "A real photograph of an impossible body, not a cartoon drawing.",
    ].join(" ");
  }
  if (VARIETY_BODY.has(id)) {
    return [
      "Subject: one full standing person, front view, arms at the sides, feet visible.",
      "Vibrant coral red-orange t-shirt, deep ink-black pants, electric lime shoes. Neutral face, not the subject.",
      `The build must match exactly: ${prompt}.`,
      "Leave empty background where needed so the unusual height or width stays obvious. Do not zoom into a normal crop.",
    ].join(" ");
  }
  return [
    "Subject: one full standing person, front view, arms at the sides, feet visible.",
    "Same vibrant outfit every time: coral red-orange t-shirt, deep ink-black straight pants, electric lime shoes.",
    "Face is a simple neutral oval with short brown hair. Do not make the face the subject.",
    `Only the body build changes: ${prompt}.`,
    "The height and width of the body must be obvious.",
  ].join(" ");
}

function pantsPreview(id: string, prompt: string) {
  if (EXAGGERATED_PANTS.has(id)) {
    return [
      "Subject: only the pants, front view, worn by an invisible figure.",
      `The pants are physically impossible and extremely exaggerated: ${prompt}.`,
      "No shirt, no shoes, no head, no hands. The pants fill the frame.",
    ].join(" ");
  }
  return [
    "Subject: only the pants, front view, as if worn by an invisible figure, from waist to hem.",
    "No shirt, no shoes, no head, no hands.",
    `The garment is: ${prompt}.`,
    "Centered and large enough to tell apart from other pants.",
  ].join(" ");
}

function shoesPreview(id: string, prompt: string) {
  if (EXAGGERATED_SHOES.has(id)) {
    return [
      "Subject: one pair of shoes, three-quarter view, both shoes visible.",
      `The shoes are physically impossible and extremely exaggerated: ${prompt}.`,
      "No person. The exaggeration must dominate the picture.",
    ].join(" ");
  }
  return [
    "Subject: one pair of shoes, three-quarter view, both shoes visible, resting on the ground.",
    "No legs above the ankle, no person.",
    `The shoes are: ${prompt}.`,
    "Centered and large.",
  ].join(" ");
}

// Face previews: shape, one feature, a regional look, or an impossible proportion.
function facePreview(id: string, prompt: string) {
  if (EXAGGERATED_FACE.has(id)) {
    return [
      "Subject: one head, front view, facing the camera, short hair, neutral expression.",
      `The face is physically impossible and extremely exaggerated: ${prompt}.`,
      "The exaggeration must dominate the picture. Do not tame it into a normal face.",
      "Not a caricature of any nationality. A real photograph of an impossible face.",
      "Show the whole exaggeration.",
    ].join(" ");
  }
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
  "Vibrant colorful studio backdrop in the Scro brand color scheme: warm cream and electric lime green (#c6f24b) gradient with a punchy coral red-orange (#ff4d2e) rim accent and deep ink-black (#12141c) shadow contrast.",
  "Centered subject, sharp focus, vivid color, natural skin, hair, and fabric texture.",
  "Real photograph. Not an illustration, not a cartoon, not a drawing, not 3D.",
  "No text, no letters, no numbers, no watermark, no border.",
].join(" ");

// Isolated picture of one option, so the picker shows that part and nothing else.
export function characterLookPreviewPrompt(part: AnyCharacterLookPart, id: string) {
  const option = characterLookOption(part, id);
  if (!option) throw new Error(`Unknown ${part} look: ${id}`);
  const subject: Record<AnyCharacterLookPart, string> = {
    hair: EXAGGERATED_HAIR.has(id)
      ? [
          "Subject: one head, front view, facing the camera, light warm skin, neutral expression.",
          `The hair is physically impossible and extremely exaggerated: ${option.prompt}.`,
          "The hairstyle must be much larger than the head and dominate the picture. Do not tame it into a normal haircut.",
          "Show the entire hairstyle, even when it extends far past the head.",
        ].join(" ")
      : FULL_HAIR.has(id)
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
      "No head, no pants, no shoes. Centered and filling the frame.",
    ].join(" "),
    pants: pantsPreview(id, option.prompt),
    shoes: shoesPreview(id, option.prompt),
    accessory: [
      "Subject: one head and shoulders mannequin wearing or holding the signature prop, front view.",
      `The signature prop/accessory is: ${option.prompt}.`,
      "Make the accessory huge, vivid, and unmistakable.",
    ].join(" "),
    expression: [
      "Subject: one head, front view, facing the camera, short hair.",
      `The facial expression is extremely vivid and exaggerated: ${option.prompt}.`,
      "Do not tame it into a polite smile.",
    ].join(" "),
  };
  return `${PREVIEW_FRAME} ${subject[part]}`;
}

const EXAGGERATION_PROMPT: Record<CharacterExaggerationLevel, string> = {
  "1x": "",
  "3x": "Exaggeration level 3x (Viral Streetwear Caricature): push the silhouette, contrast, and proportions 3x bolder than an ordinary person so the character grabs attention immediately.",
  "10x": "Exaggeration level 10x (Scroll-Stopping Fever Dream): push every selected proportion to an extreme, physically impossible, viral show-stopping scale with bold 12mm wide-angle presence — never tame or normalize the silhouette.",
};

// One description for the blueprint. Every selected part is named so GPT Image keeps the combination.
export function characterLookPrompt(selection: CharacterLookSelection) {
  const lines = CHARACTER_LOOK_PARTS.map((part) => {
    const option = CHARACTER_LOOKS[part].find((item) => item.id === selection[part]);
    if (!option) throw new Error(`Unknown ${part} look: ${selection[part]}`);
    return `${PART_LABEL[part]}: ${option.prompt}.`;
  });
  for (const part of CHARACTER_EXTRA_PARTS) {
    const id = selection[part];
    if (!id) continue;
    // Skip default neutral/none extras so legacy callers stay unchanged unless chosen.
    if ((part === "top" && id === "tee") || (part === "accessory" && id === "none") || (part === "expression" && id === "neutral")) {
      continue;
    }
    const option = CHARACTER_EXTRA_LOOKS[part].find((item) => item.id === id);
    if (option) lines.push(`${PART_LABEL[part]}: ${option.prompt}.`);
  }
  const ex = selection.exaggeration && selection.exaggeration !== "1x" ? EXAGGERATION_PROMPT[selection.exaggeration] : "";
  if (ex) lines.push(ex);
  lines.push(
    "Draw this exact combination on one character. Do not swap the hair, face shape, build, pants, or shoes.",
  );
  return lines.join("\n");
}

// One still: four standing views on top, four different action poses below.
export function characterPoseSheetPrompt(selection: CharacterLookSelection) {
  return [
    "Photorealistic character sheet on one square canvas, two rows of four full-body figures.",
    "Same person in every figure: same face, hair, build, pants, and shoes. Vibrant studio lighting with a warm cream and electric lime green (#c6f24b) backdrop and subtle coral red-orange (#ff4d2e) accent rim light.",
    "Top row, left to right, standing still with arms relaxed: front view, left side, back view, right side.",
    "Bottom row, left to right, four different poses of that same person: walking toward the camera mid-step, both arms stretched straight overhead, hands on hips with weight on one leg, and a deep squat with both feet flat.",
    "Every figure is full body, head to shoes, with space between them. Do not repeat the standing turnaround on the bottom row.",
    "No text, no labels, no props, no extra people.",
    characterLookPrompt(selection),
  ].join("\n");
}

// Edit the current sheet from a user comment. Unmentioned details stay.
export function characterPoseRevisionPrompt(selection: CharacterLookSelection, comment: string) {
  return [
    "Edit the attached photorealistic photograph.",
    "Change only what this comment asks. Keep the same person, clothes, background, framing, and every pose the comment does not mention.",
    `Comment: ${comment.trim()}`,
    "Stay a real photograph. No text, no labels, no watermark.",
    "The person should still match this look, unless the comment changes it:",
    characterLookPrompt(selection),
  ].join("\n");
}
