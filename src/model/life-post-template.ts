// Client-safe catalog of Life post-type templates, distilled from ~3.7k labelled creator posts.
import type { LifeShotKind } from "@/model/life-shot-kind";

export const LIFE_POST_CATEGORIES = [
  "branding",
  "street",
  "cafe",
  "selfie",
  "home",
  "travel",
  "social",
] as const;

export type LifePostCategoryId = (typeof LIFE_POST_CATEGORIES)[number];

export type LifePostTemplate = {
  id: string;
  categoryId: LifePostCategoryId;
  // Closest legacy shot kind, stored on the LifeShot and used for scene search words.
  kind: LifeShotKind;
  // English composition / pose recipe appended to the life shot prompt.
  promptGuide: string;
  /** Optional curated tags for UI filters and MCP search. */
  tags?: readonly string[];
};

/** Category + kind + curated tags, plus a few id-derived activity tags. */
export function lifePostTemplateTags(template: LifePostTemplate): string[] {
  const tags = new Set<string>([template.categoryId, template.kind, ...(template.tags ?? [])]);
  const id = template.id.toLowerCase();
  if (id.includes("sport") || id.includes("pickle") || id.includes("yoga") || id.includes("tennis") || id.includes("climb")) {
    tags.add("athletic");
  }
  if (id.includes("pickle") || id.includes("peek")) tags.add("pickleball");
  if (id.includes("yoga") || id.includes("sound-bath")) tags.add("yoga");
  if (id.includes("climb")) tags.add("climbing");
  if (id.includes("ootd") || id.includes("street") || id.includes("crosswalk")) tags.add("street");
  if (id.includes("selfie") || id.includes("mirror") || id.includes("vanity")) tags.add("selfie");
  if (id.includes("cafe") || id.includes("bistro") || id.includes("dessert") || id.includes("drink")) {
    tags.add("cafe");
  }
  if (id.includes("travel") || id.includes("beach") || id.includes("landmark") || id.includes("nature")) {
    tags.add("travel");
  }
  if (id.includes("branding") || id.includes("founder") || id.includes("podcast") || id.includes("closet")) {
    tags.add("branding");
  }
  if (id.includes("casual") || id.includes("lounge") || id.includes("sofa") || id.includes("home")) {
    tags.add("casual");
  }
  return [...tags];
}

export const LIFE_POST_TEMPLATES: readonly LifePostTemplate[] = [
  // Personal branding & styling
  {
    id: "branding-closet-guide",
    categoryId: "branding",
    kind: "hobby",
    promptGuide:
      "Closet styling guide: the character stands full-length in front of a warm-lit wooden open wardrobe lined with neatly hung garments, presenting a curated outfit while holding a compact wireless lapel microphone to speak into the camera.",
  },
  {
    id: "branding-rack-showcase",
    categoryId: "branding",
    kind: "hobby",
    promptGuide:
      "Styling rack showcase: the character stands full-body beside a minimalist boutique garment rack hung with neutral capsule clothing in a bright studio room, demonstrating a tailored layered look head-to-toe.",
  },
  {
    id: "branding-founder-desk",
    categoryId: "branding",
    kind: "hobby",
    promptGuide:
      "Founder desk talk: the character sits at a clean modern creator workspace desk with an open laptop and desktop podcast microphone, using natural conversational hand gestures while speaking directly into the camera.",
  },
  {
    id: "branding-podcast-mic",
    categoryId: "branding",
    kind: "hobby",
    promptGuide:
      "Podcast studio portrait: the character sits in a warm acoustic studio wearing over-ear monitor headphones and speaking earnestly into a broadcast boom-arm microphone, framed upper-body with expressive hand gestures.",
  },
  {
    id: "branding-book-share",
    categoryId: "branding",
    kind: "hobby",
    promptGuide:
      "Book recommendation share: the character stands or sits in a bright contemporary office holding up a physical book near chest level with the cover facing out, smiling warmly and speaking directly into the lens.",
  },
  {
    id: "branding-street-mic",
    categoryId: "branding",
    kind: "street",
    promptGuide:
      "Street creator vox-pop: the character stands centered on a lively urban sidewalk or crosswalk holding a mini wireless clip microphone in one hand and an iced coffee in the other, addressing the viewer directly, framed knee-up.",
  },
  {
    id: "branding-park-bench-talk",
    categoryId: "branding",
    kind: "street",
    promptGuide:
      "Outdoor park bench talk: the character sits casually with legs crossed on a wooden park bench surrounded by lush green foliage in natural daylight, speaking conversationally toward the camera with relaxed hand gestures.",
  },
  {
    id: "branding-cafe-work",
    categoryId: "branding",
    kind: "food",
    promptGuide:
      "Founder cafe work session: the character sits by a sunlit cafe window table with an open laptop, leather notebook, and ceramic coffee cup, looking up into the camera with a composed, confident creator smile, framed half-body.",
  },
  {
    id: "branding-boutique-mirror",
    categoryId: "branding",
    kind: "selfie",
    promptGuide:
      "Boutique fitting mirror selfie: the character captures a full-length mirror reflection inside a minimalist designer concept store with soft warm architectural lighting, showcasing a layered seasonal outfit and handbag.",
  },
  {
    id: "branding-gallery-exhibit",
    categoryId: "branding",
    kind: "hobby",
    promptGuide:
      "Art gallery exhibit visit: the character stands or sits in a clean contemporary museum or art gallery beside a minimalist framed artwork or illuminated vitrine, holding an exhibition brochure and looking thoughtfully toward the lens, framed knee-up.",
  },
  {
    id: "branding-rooftop-terrace",
    categoryId: "cafe",
    kind: "food",
    promptGuide:
      "Rooftop terrace cafe portrait: the character stands or leans by an outdoor high-top terrace table overlooking a panoramic city skyline, holding an iced drink with one arm resting on the ledge and smiling toward the camera, framed knee-up.",
  },
  {
    id: "branding-bistro-night",
    categoryId: "cafe",
    kind: "food",
    promptGuide:
      "Candlelit bistro dining moment: the character sits at an intimate French or Italian bistro table set with shared dishes and wine glasses under warm ambient evening light, holding a fork or glass with a soft candid smile, framed half-body.",
  },
  {
    id: "branding-vanity-glam",
    categoryId: "selfie",
    kind: "selfie",
    promptGuide:
      "Backstage vanity beauty portrait: the character sits in front of an illuminated dressing room vanity mirror with makeup brushes on the counter, one hand lightly resting near the cheek while gazing into the lens, framed upper-body.",
  },
  {
    id: "branding-crosswalk-snap",
    categoryId: "street",
    kind: "street",
    promptGuide:
      "City crosswalk snapshot: the character stands or steps across a sunlit urban pedestrian zebra crossing in a layered coat or street outfit, turning to smile directly into the camera with city architecture softly behind, framed full-body.",
  },
  {
    id: "branding-concert-night",
    categoryId: "social",
    kind: "hobby",
    promptGuide:
      "Concert arena night snapshot: the character poses by a stadium or live-house spectator railing illuminated by direct camera flash against glowing stage lights in the background, flashing a peace sign with a bright excited smile, framed half-body.",
  },
  {
    id: "branding-car-cabin",
    categoryId: "travel",
    kind: "street",
    promptGuide:
      "Car cabin passenger portrait: the character sits belted in the leather passenger seat of a sleek modern car with soft daylight coming through the side window, wearing statement eyewear and glancing toward the camera, framed upper-body.",
  },
  // Street style
  {
    id: "street-ootd-full",
    categoryId: "street",
    kind: "street",
    promptGuide:
      "Full-body street OOTD: the character stands facing the camera at eye level, whole outfit visible head to shoes, relaxed weight on one leg, storefront or city street softly behind.",
  },
  {
    id: "street-knee-up",
    categoryId: "street",
    kind: "street",
    promptGuide:
      "Knee-up street portrait: the character stands facing the camera, framed from the knees up, natural smile, the street behind still readable.",
  },
  {
    id: "street-walking",
    categoryId: "street",
    kind: "street",
    promptGuide:
      "Candid walking shot: the character is mid-stride crossing the frame, looking ahead or slightly away, full body, slight motion in the hair and clothes.",
  },
  {
    id: "street-look-back",
    categoryId: "street",
    kind: "street",
    promptGuide:
      "Look-back pose: the character's body is turned away from the camera and they glance back over the shoulder into the lens, framed knee-up.",
  },
  {
    id: "street-lean-wall",
    categoryId: "street",
    kind: "street",
    promptGuide:
      "Leaning pose: the character leans a shoulder or back against a wall, railing or shop front, one knee bent, hands relaxed or holding a bag, full body.",
  },
  {
    id: "street-night-flash",
    categoryId: "street",
    kind: "street",
    promptGuide:
      "Night flash snapshot: direct on-camera flash at night lights the character from the front with a crisp hard shadow behind, dark ambient background with city lights, framed knee-up.",
  },
  {
    id: "street-crouch-high",
    categoryId: "street",
    kind: "street",
    promptGuide:
      "High-angle crouch: the character crouches or squats on the pavement or steps, shot from slightly above, looking up at the camera, full body.",
  },
  // Cafe & food
  {
    id: "cafe-seated-camera",
    categoryId: "cafe",
    kind: "food",
    promptGuide:
      "Seated cafe portrait: the character sits at a cafe table facing the camera, framed half-body, a drink on the table in front, warm interior behind.",
  },
  {
    id: "cafe-candid-away",
    categoryId: "cafe",
    kind: "food",
    promptGuide:
      "Cafe candid: the character sits at a table looking away from the camera or out of the window with a soft natural smile, upper body, as if unaware of the photo.",
  },
  {
    id: "cafe-chin-on-hand",
    categoryId: "cafe",
    kind: "food",
    promptGuide:
      "Chin-on-hand pose: the character rests an elbow on the table and the chin or cheek on that hand, looking at the camera, upper body, drink or dessert nearby.",
  },
  {
    id: "cafe-holding-drink",
    categoryId: "cafe",
    kind: "food",
    promptGuide:
      "Holding a drink: the character holds an iced drink or coffee cup near the chest or face, sipping or smiling at the camera, framed half-body.",
  },
  {
    id: "cafe-with-dessert",
    categoryId: "cafe",
    kind: "food",
    promptGuide:
      "Dessert moment: the character poses with a dessert or dish, holding it up or with a fork mid-bite, framed half-body, the food sharp and appetising.",
  },
  {
    id: "cafe-table-overhead",
    categoryId: "cafe",
    kind: "food",
    promptGuide:
      "Overhead table spread: high-angle top-down view of the table with plates and drinks arranged; the character is only partly in frame (hands reaching for food or sitting at the edge).",
  },
  {
    id: "cafe-interior-corner",
    categoryId: "cafe",
    kind: "food",
    promptGuide:
      "Cafe interior wide shot: the space and its design dominate the frame; the character sits small in a corner seat, natural and unposed.",
  },
  // Selfie
  {
    id: "selfie-high-arm",
    categoryId: "selfie",
    kind: "selfie",
    promptGuide:
      "High-angle arm selfie: the phone is held above eye level at arm's length, the character looks up into the lens, upper body, slight wide-angle phone perspective.",
  },
  {
    id: "selfie-mirror-cover",
    categoryId: "selfie",
    kind: "selfie",
    promptGuide:
      "Mirror selfie: the character photographs their reflection in a mirror, phone held in front of the face partly covering it, outfit visible half or full body.",
  },
  {
    id: "selfie-home-bed",
    categoryId: "selfie",
    kind: "selfie",
    promptGuide:
      "Cozy home selfie: arm's-length selfie lying or sitting on a bed or sofa, soft indoor light, relaxed expression, upper body.",
  },
  {
    id: "selfie-beauty-close",
    categoryId: "selfie",
    kind: "selfie",
    promptGuide:
      "Beauty close-up: tight face and shoulders framing, one hand lightly near the cheek or chin, soft window light showing real skin texture and makeup detail.",
  },
  // Home
  {
    id: "home-sofa-lounge",
    categoryId: "home",
    kind: "hobby",
    promptGuide:
      "Lounging at home: the character lies or curls up on a sofa or bed in casual clothes, relaxed and unhurried, half or full body.",
  },
  {
    id: "home-window-light",
    categoryId: "home",
    kind: "hobby",
    promptGuide:
      "Window light portrait: the character stands or sits beside a window, strong side daylight shaping the face, gentle shadows across the room, half-body.",
  },
  {
    id: "home-morning-bed",
    categoryId: "home",
    kind: "hobby",
    promptGuide:
      "Morning in bed: the character sits up in messy bed sheets, just woken, stretching or rubbing their eyes, soft morning light, candid.",
  },
  {
    id: "home-product",
    categoryId: "home",
    kind: "hobby",
    promptGuide:
      "Product share: the character holds a product toward the camera at chest height, label facing the lens, friendly expression, half-body, tidy home background.",
  },
  // Travel
  {
    id: "travel-landmark",
    categoryId: "travel",
    kind: "street",
    promptGuide:
      "Landmark check-in: the character poses facing the camera in front of a recognisable landmark, which stays readable behind them, knee-up or full body.",
  },
  {
    id: "travel-beach-resort",
    categoryId: "travel",
    kind: "street",
    promptGuide:
      "Beach or resort holiday: the character stands or sits by the sea or pool in bright sunlight, holiday outfit, full body, sky and water filling the background.",
  },
  {
    id: "travel-back-view",
    categoryId: "travel",
    kind: "street",
    promptGuide:
      "Back view: the character faces away from the camera toward the view, full body, the scenery taking most of the frame.",
  },
  {
    id: "travel-railing-view",
    categoryId: "travel",
    kind: "street",
    promptGuide:
      "Railing view: the character leans on a railing or balcony edge with a scenic background, looking at the camera or over the view, knee-up.",
  },
  {
    id: "travel-nature",
    categoryId: "travel",
    kind: "street",
    promptGuide:
      "Nature walk: the character in a park, garden or field of flowers, soft daylight through leaves, natural relaxed pose, knee-up.",
  },
  // Social & sport
  {
    id: "social-friends",
    categoryId: "social",
    kind: "hobby",
    promptGuide:
      "Friends photo: the character poses together with two or three friends (generic people, not the main identity), everyone facing the camera, full body.",
  },
  {
    id: "social-party-flash",
    categoryId: "social",
    kind: "hobby",
    promptGuide:
      "Party flash: indoor event or party, direct flash, the character celebrating with a drink or peace sign, festive background, half-body.",
  },
  {
    id: "social-sport",
    categoryId: "social",
    kind: "hobby",
    tags: ["athletic", "casual"],
    promptGuide:
      "Sport day: the character in activewear at a gym, court or running track, caught mid-activity or in a post-workout pose, full body.",
  },
  {
    id: "social-pickleball",
    categoryId: "social",
    kind: "hobby",
    tags: ["athletic", "pickleball", "tennis", "summer"],
    promptGuide:
      "Pickleball Peek-A-Boo court moment: the character stands on an outdoor pickleball court in a layered athletic skort or court dress, holding a paddle, sunny hard-court lines visible, full body eye-level.",
  },
  {
    id: "social-yoga-mat",
    categoryId: "social",
    kind: "hobby",
    tags: ["athletic", "yoga", "casual", "lounge"],
    promptGuide:
      "Yoga studio cool-down: the character sits or stands on a rolled yoga mat in soft studio light wearing stretch activewear, calm post-practice pose, framed full or knee-up.",
  },
  {
    id: "social-sound-bath",
    categoryId: "social",
    kind: "hobby",
    tags: ["yoga", "casual", "lounge"],
    promptGuide:
      "Sound bath meditation session: the character sits cross-legged on a floor cushion surrounded by frosted crystal singing bowls under warm low studio lighting, gently holding a suede mallet with a serene expression, framed knee-up.",
  },
  {
    id: "social-climbing-wall",
    categoryId: "social",
    kind: "hobby",
    tags: ["athletic", "climbing"],
    promptGuide:
      "Bouldering & climbing session: the character stands or hangs at an indoor bouldering wall or sunlit rock crag wearing a climbing harness and chalk bag, gripping colorful holds and looking back toward the camera, framed full-body.",
  },
  {
    id: "social-country-club",
    categoryId: "social",
    kind: "hobby",
    tags: ["athletic", "tennis", "pickleball", "casual"],
    promptGuide:
      "Country-club court lifestyle: the character stands court-side or leans against the net in preppy layered knitwear or court polo with a striped canvas racket tote, warm afternoon sun, framed full-body or knee-up.",
  },
  {
    id: "street-casual-weekend",
    categoryId: "street",
    kind: "street",
    tags: ["casual", "street", "summer"],
    promptGuide:
      "Casual weekend street stroll: the character walks a sunny neighborhood sidewalk in relaxed everyday layers (linen, henley, or fleece), coffee in hand, candid knee-up or full body.",
  },
  {
    id: "street-minimal-lookbook",
    categoryId: "street",
    kind: "street",
    tags: ["street", "casual", "branding"],
    promptGuide:
      "Minimalist architectural lookbook: the character stands in a clean sunlit stone doorway or against a neutral paneled wall in structured outerwear and wide-leg trousers, one hand in the pocket, framed full-body.",
  },
  {
    id: "selfie-car-golden-hour",
    categoryId: "selfie",
    kind: "selfie",
    tags: ["selfie", "casual", "travel"],
    promptGuide:
      "Golden-hour car passenger-seat selfie: the character sits belted in a modern car cabin with warm sunset window light across the face, holding the phone slightly above eye level for an effortless candid selfie, framed upper-body.",
  },
  {
    id: "cafe-night-flash-toast",
    categoryId: "cafe",
    kind: "food",
    tags: ["cafe", "casual"],
    promptGuide:
      "Night flash bistro toast: direct camera flash in a dimly lit wooden dining booth or izakaya, the character holds up a cocktail glass or iced drink near the cheek with a playful wink or warm smile, framed half-body.",
  },
  {
    id: "travel-inflight-cabin",
    categoryId: "travel",
    kind: "street",
    tags: ["travel", "casual", "lounge"],
    promptGuide:
      "In-flight cabin window seat: the character sits curled up comfortably in an airplane window seat in cozy travel knitwear, holding a coffee cup or snack with soft oval window daylight, framed knee-up.",
  },
  {
    id: "travel-yacht-deck",
    categoryId: "travel",
    kind: "street",
    tags: ["travel", "casual", "summer"],
    promptGuide:
      "Yacht deck & pier sunset: the character sits or leans on a white boat deck or seaside pier edge with turquoise water and sunlit coastline behind, breeze in the hair, framed knee-up or full-body.",
  },
];

const BY_ID = new Map(LIFE_POST_TEMPLATES.map((template) => [template.id, template]));

// Lookup used by the server action; unknown ids return null.
export function lifePostTemplateById(id: string | undefined | null): LifePostTemplate | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function lifePostTemplatesInCategory(categoryId: LifePostCategoryId) {
  return LIFE_POST_TEMPLATES.filter((template) => template.categoryId === categoryId);
}

// Gemini-generated Scro example still for the picker card.
export function lifePostTemplatePreviewSrc(id: string) {
  return `/life-templates/${id}.webp?v=2`;
}
