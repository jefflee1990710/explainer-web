// Client-safe catalog of Life post-type templates, distilled from ~3.7k labelled creator posts.
import type { LifeShotKind } from "@/model/life-shot-kind";

export const LIFE_POST_CATEGORIES = ["street", "cafe", "selfie", "home", "travel", "social"] as const;

export type LifePostCategoryId = (typeof LIFE_POST_CATEGORIES)[number];

export type LifePostTemplate = {
  id: string;
  categoryId: LifePostCategoryId;
  // Closest legacy shot kind, stored on the LifeShot and used for scene search words.
  kind: LifeShotKind;
  // English composition / pose recipe appended to the life shot prompt.
  promptGuide: string;
};

export const LIFE_POST_TEMPLATES: readonly LifePostTemplate[] = [
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
    promptGuide:
      "Sport day: the character in activewear at a gym, court or running track, caught mid-activity or in a post-workout pose, full body.",
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

// Gemini-generated example still for the picker card.
export function lifePostTemplatePreviewSrc(id: string) {
  return `/life-templates/${id}.webp?v=1`;
}
