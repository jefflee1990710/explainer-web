/**
 * Inspects all downloaded Instagram post images and extractions across `experiments/*-instagram/`,
 * matches every post's extracted wardrobe (cloth: top + pants, shoe: shoes, accessory, hair),
 * scene template, and pose skeleton against the available catalog in `src/service/character/`
 * and `src/model/life-*`, and outputs:
 *   1. `experiments/ig-recommended-combinations.jsonl` — all 1,376 mapped IG post combinations
 *   2. `src/model/wardrobe-combinations.data.ts` — curated & validated catalog of signature
 *      recommended outfit combinations across all 51 downloaded Instagram accounts.
 *
 * Usage:
 *   npx tsx scripts/experiments/build-wardrobe-combinations.ts
 */

import fs from "node:fs";
import path from "node:path";
import {
  optionsForLookPart,
  type CharacterLookOption,
} from "@/service/character/character-look";
import { LIFE_POSES } from "@/model/life-poses.data";
import { LIFE_POST_TEMPLATES } from "@/model/life-post-template";
import {
  IG_POST_FRAMINGS,
  IG_POST_SETTINGS,
  IG_POST_SHOT_TYPES,
  WardrobeCombinationSchema,
  type IgPostFraming,
  type IgPostSetting,
  type IgPostShotType,
  type WardrobeCombination,
} from "@/model/wardrobe-combination";

const CHARACTER_TOPS = optionsForLookPart("top");
const CHARACTER_PANTS = optionsForLookPart("pants");
const CHARACTER_SHOES = optionsForLookPart("shoes");
const CHARACTER_ACCESSORIES = optionsForLookPart("accessory");
const CHARACTER_HAIRSTYLES = optionsForLookPart("hair");

interface ExtractedPiece {
  idSlug: string;
  labelEn: string;
  labelZhHant: string;
  category: string;
  prompt: string;
  visible: boolean;
}

interface ExtractedPostRow {
  file: string;
  account: string;
  shortcode: string;
  framing: string;
  shotType: string;
  setting: string;
  pose: string;
  hair: ExtractedPiece;
  top: ExtractedPiece;
  pants: ExtractedPiece;
  shoes: ExtractedPiece;
  accessory: ExtractedPiece;
}

const ROOT = process.cwd();
const EXPERIMENTS_DIR = path.join(ROOT, "experiments");
const EXTRACTIONS_PATH = path.join(EXPERIMENTS_DIR, "ig-branding-styling-extractions.jsonl");
const AMENDA_OUTFITS_PATH = path.join(EXPERIMENTS_DIR, "amenda-lee-instagram", "post-outfits.json");
const OUT_JSONL_PATH = path.join(EXPERIMENTS_DIR, "ig-recommended-combinations.jsonl");
const OUT_DATA_TS_PATH = path.join(ROOT, "src", "model", "wardrobe-combinations.data.ts");

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set([
  "with",
  "and",
  "the",
  "from",
  "for",
  "over",
  "under",
  "worn",
  "paired",
  "styled",
  "isolated",
  "wardrobe",
  "piece",
  "distilled",
  "featuring",
  "soft",
  "clean",
  "light",
  "dark",
  "subtle",
  "classic",
  "modern",
  "casual",
  "fit",
  "style",
]);

function normalizeFraming(raw: string): IgPostFraming {
  if ((IG_POST_FRAMINGS as readonly string[]).includes(raw)) {
    return raw as IgPostFraming;
  }
  return "half_body";
}

function normalizeShotType(raw: string): IgPostShotType {
  if ((IG_POST_SHOT_TYPES as readonly string[]).includes(raw)) {
    return raw as IgPostShotType;
  }
  return "posed_portrait";
}

function normalizeSetting(raw: string): IgPostSetting {
  if ((IG_POST_SETTINGS as readonly string[]).includes(raw)) {
    return raw as IgPostSetting;
  }
  return "other";
}

function matchBestCatalogOption(
  piece: ExtractedPiece,
  account: string,
  options: readonly CharacterLookOption[],
  fallbackId: string,
): string {
  const queryTokens = tokenize(`${piece.labelEn} ${piece.prompt} ${piece.idSlug}`);
  if (queryTokens.length === 0) return fallbackId;

  const accountLower = account.toLowerCase().replace(/[^a-z0-9]/g, "");
  let bestId = fallbackId;
  let bestScore = -1;

  for (const opt of options) {
    const hay = `${opt.id} ${opt.description} ${opt.prompt}`.toLowerCase();
    let score = 0;
    // Boost if option description explicitly credits this creator/brand account
    if (accountLower.length >= 4 && hay.replace(/[^a-z0-9]/g, "").includes(accountLower)) {
      score += 6;
    }
    for (const tok of queryTokens) {
      if (hay.includes(tok)) {
        score += tok.length >= 6 ? 2.5 : 1.5;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = opt.id;
    }
  }
  return bestId;
}

function inferTemplateId(row: ExtractedPostRow): string {
  const { setting, shotType, framing, pose, account } = row;
  const poseLower = pose.toLowerCase();
  const accLower = account.toLowerCase();

  if (accLower.includes("pickleball") || poseLower.includes("pickleball") || poseLower.includes("paddle")) {
    return "social-pickleball";
  }
  if (accLower.includes("blackdiamond") || poseLower.includes("climb") || poseLower.includes("boulder")) {
    return "social-climbing-wall";
  }
  if (poseLower.includes("singing bowl") || poseLower.includes("meditat") || poseLower.includes("sound bath")) {
    return "social-sound-bath";
  }
  if (accLower.includes("aloyoga") || accLower.includes("lululemon") || poseLower.includes("yoga")) {
    return "social-yoga-mat";
  }
  if (accLower.includes("wilson") || accLower.includes("sportyandrich") || poseLower.includes("racket") || poseLower.includes("tennis")) {
    return "social-country-club";
  }
  if (setting === "gym_sport") return "social-sport";
  if (setting === "car" && shotType === "arm_selfie") return "selfie-car-golden-hour";
  if (setting === "car") return "branding-car-cabin";
  if (setting === "transport" && (poseLower.includes("airplane") || poseLower.includes("plane") || poseLower.includes("seat"))) {
    return "travel-inflight-cabin";
  }
  if (shotType === "mirror_selfie") {
    return setting === "shop_mall" ? "branding-boutique-mirror" : "selfie-mirror-cover";
  }
  if (shotType === "arm_selfie") {
    return setting === "bedroom" || setting === "home_living" ? "selfie-home-bed" : "selfie-high-arm";
  }
  if (shotType === "talking_head") {
    if (setting === "office_work") return "branding-founder-desk";
    if (setting === "street_urban") return "branding-street-mic";
    return "branding-closet-guide";
  }
  if (setting === "cafe_restaurant") {
    if (poseLower.includes("cocktail") || poseLower.includes("wine") || poseLower.includes("flash")) {
      return "cafe-night-flash-toast";
    }
    if (poseLower.includes("chin")) return "cafe-chin-on-hand";
    if (poseLower.includes("cup") || poseLower.includes("drink") || poseLower.includes("coffee") || poseLower.includes("matcha")) {
      return "cafe-holding-drink";
    }
    if (poseLower.includes("dessert") || poseLower.includes("cake") || poseLower.includes("fries")) {
      return "cafe-with-dessert";
    }
    return "cafe-seated-camera";
  }
  if (setting === "beach_water") {
    if (poseLower.includes("pier") || poseLower.includes("boat") || poseLower.includes("yacht") || poseLower.includes("deck")) {
      return "travel-yacht-deck";
    }
    if (shotType === "back_view") return "travel-back-view";
    return "travel-beach-resort";
  }
  if (setting === "travel_landmark") {
    if (poseLower.includes("railing")) return "travel-railing-view";
    return "travel-landmark";
  }
  if (setting === "nature_park") {
    if (poseLower.includes("bench")) return "branding-park-bench-talk";
    return "travel-nature";
  }
  if (setting === "home_living" || setting === "bedroom") {
    if (shotType === "product_showcase") return "home-product";
    if (setting === "bedroom") return "home-morning-bed";
    return "home-sofa-lounge";
  }
  if (setting === "studio_plain_wall" || setting === "shop_mall") {
    return "street-minimal-lookbook";
  }
  if (setting === "street_urban") {
    if (poseLower.includes("walk") || poseLower.includes("stride")) return "street-walking";
    if (poseLower.includes("lean") || poseLower.includes("wall") || poseLower.includes("railing")) return "street-lean-wall";
    if (poseLower.includes("crouch") || poseLower.includes("squat")) return "street-crouch-high";
    if (framing === "full_body") return "street-ootd-full";
    return "street-knee-up";
  }
  return "street-casual-weekend";
}

function inferPoseId(row: ExtractedPostRow): string {
  const p = row.pose.toLowerCase();
  if (p.includes("pickleball") && p.includes("swing")) return "sport-pickleball-swing";
  if (p.includes("pickleball") || p.includes("paddle")) return "sport-pickleball-ready";
  if (p.includes("bow") || p.includes("archer")) return "sport-archery-draw";
  if (p.includes("climb") || p.includes("harness")) return "sport-climbing-overhang";
  if (p.includes("singing bowl") || p.includes("meditat")) return "sport-sound-bath-sit";
  if (p.includes("upward") || (p.includes("arms") && p.includes("overhead"))) return "sport-yoga-upward-salute";
  if (p.includes("tatami") || p.includes("matcha")) return "casual-tatami-matcha-kneel";
  if (p.includes("airplane") || (p.includes("curled") && p.includes("seat"))) return "casual-inflight-curl";
  if (p.includes("armchair") || (p.includes("curled") && p.includes("chair"))) return "casual-armchair-curl";
  if (p.includes("table") && p.includes("ankle")) return "casual-table-ankle-cross";
  if (p.includes("net") && p.includes("lean")) return "sport-court-net-lean";
  if (row.shotType === "mirror_selfie") return "boutique-mirror-full";
  if (p.includes("walk") && p.includes("coffee")) return "walk-coffee-bag-stride";
  if (p.includes("walk") && p.includes("crosswalk")) return "walk-crosswalk-glance";
  if (p.includes("walk")) return "walking-stride-blazer";
  if (p.includes("crouch") || p.includes("squat")) return "crouch-chin-rest";
  if (p.includes("peace") || p.includes("v-sign")) return "concert-peace-flash";
  if (p.includes("chin") && (p.includes("sit") || p.includes("seat"))) return "seated-hand-to-chin-full";
  if (p.includes("sit") || p.includes("seat")) return "park-bench-crossed-talk";
  if (p.includes("pocket")) return "tailored-pocket-stance";
  return "stylist-bag-showcase";
}

function collectComboTags(
  topId: string,
  pantsId: string,
  shoesId: string,
  accessoryId: string,
  extraTags: string[] = [],
): string[] {
  const set = new Set<string>(extraTags);
  const allOpts = [
    ...CHARACTER_TOPS,
    ...CHARACTER_PANTS,
    ...CHARACTER_SHOES,
    ...CHARACTER_ACCESSORIES,
  ];
  for (const id of [topId, pantsId, shoesId, accessoryId]) {
    const found = allOpts.find((o) => o.id === id);
    if (found?.tags) {
      for (const t of found.tags) set.add(t);
    }
  }
  if (set.size === 0) set.add("casual");
  return Array.from(set);
}

// Curated signature combinations across the downloaded IG accounts (including the 10 new lifestyle accounts,
// sports/pickleball/yoga/climbing accounts, casual lookbook accounts, branding/styling accounts, and HK/TW creators).
const CURATED_COMBINATIONS: WardrobeCombination[] = [
  // ── 10 Newly Distilled Lifestyle Creators ──────────────────────────────────
  {
    id: "combo-tnnn26-bolero-tierskirt",
    nameEn: "Seoul Cafe Bolero & Tiered Lace Skirt",
    nameZh: "首爾咖啡廳鏤空罩衫配純白蕾絲蛋糕裙",
    description:
      "Soft Korean cafe look pairing a cropped cream pointelle bolero shrug over a ribbed tank with a white tiered broderie mini skirt, quilted puffy crescent bag, and crimson retro sneakers.",
    items: {
      top: "cscasualboleroshrug",
      pants: "cscasualtierlaceskirt",
      shoes: "cscasualredretro",
      accessory: "cscasualpuffybag",
      hair: "cscasualsoftupdo",
    },
    recommendedTemplateId: "cafe-holding-drink",
    recommendedPoseId: "seated-hand-to-chin-full",
    tags: ["casual", "lounge", "korea", "summer"],
    sourcePost: {
      account: "_tnnn26",
      shortcode: "DWOQlkrkkNm",
      imageFile: "_tnnn26-instagram/posts/015_DWOQlkrkkNm.jpg",
      framing: "knee_up",
      shotType: "posed_portrait",
      setting: "cafe_restaurant",
    },
    extractedRaw: {
      top: "Cropped Open-Knit Bolero & White Tank",
      pants: "White Tiered Lace Mini Skirt",
      shoes: "Crimson Suede Retro Sneakers",
      accessory: "Quilted Puffy Crescent Bag",
      hair: "Relaxed Casual Updo with Wispy Bangs",
    },
  },
  {
    id: "combo-tnnn26-satin-jersey-street",
    nameEn: "Icy-Blue Sporty Satin Jersey & Parachute Cargos",
    nameZh: "冰藍緞面運動球衣配降落傘工裝褲",
    description:
      "Blokecore-inspired urban street outfit combining an oversized icy-blue satin polo jersey with light-grey buckle-strap parachute cargos and retro metal headphones.",
    items: {
      top: "cscasualsatinjersey",
      pants: "cscasualstrappedcargo",
      shoes: "cscasualvelcrosneak",
      accessory: "cscasualretroheadset",
      hair: "cscasualclawclip",
    },
    recommendedTemplateId: "street-ootd-full",
    recommendedPoseId: "concert-peace-flash",
    tags: ["casual", "street", "athletic", "korea"],
    sourcePost: {
      account: "_tnnn26",
      shortcode: "DV3BuhjjOuL",
      imageFile: "_tnnn26-instagram/posts/017_DV3BuhjjOuL.jpg",
      framing: "full_body",
      shotType: "ootd_full_body",
      setting: "beach_water",
    },
    extractedRaw: {
      top: "Oversized Light Blue Satin Sporty Top",
      pants: "Baggy Parachute Cargo Pants",
      shoes: "White Low-Profile Sneakers",
      accessory: "Silver Retro On-Ear Headphones",
    },
  },
  {
    id: "combo-yeyedamei-gingham-slingback",
    nameEn: "Blue Gingham Lounge Shorts & Crystal Slingbacks",
    nameZh: "淺藍格紋荷葉邊短褲配亮黑方鑽低跟鞋",
    description:
      "Playful high-low styling mixing a crimson fine-knit cardigan and blue micro-gingham cotton shorts with glossy crystal-buckle slingback kitten heels and a plush-charm mini bag.",
    items: {
      top: "cscasualredcardigan",
      pants: "cscasualginghamshorts",
      shoes: "cscasualcrystalpumps",
      accessory: "cscasualcharmminibag",
      hair: "cscasualsleektuck",
    },
    recommendedTemplateId: "cafe-interior-corner",
    recommendedPoseId: "casual-table-ankle-cross",
    tags: ["casual", "lounge", "summer", "korea"],
    sourcePost: {
      account: "yeyedamei",
      shortcode: "DdwX0Ukk0a3",
      imageFile: "yeyedamei-instagram/posts/013_DdwX0Ukk0a3.jpg",
      framing: "full_body",
      shotType: "ootd_full_body",
      setting: "cafe_restaurant",
    },
    extractedRaw: {
      top: "Fitted Knit Top",
      pants: "Light Blue Gingham Shorts",
      shoes: "Black Embellished Slingback Heels",
      accessory: "Cream Mini Bag with Plush Charm",
    },
  },
  {
    id: "combo-yeyedamei-bench-bag-charm",
    nameEn: "Street Bench Cropped Knit & Barrel Pants",
    nameZh: "街頭長椅短版針織配米白繭型闊褲",
    description:
      "Effortless street OOTD with a cream bolero knit set, off-white high-waisted barrel utility pants, split-toe tabi flats, and a cream mini handbag with a plush keychain charm.",
    items: {
      top: "cscasualboleroshrug",
      pants: "cscasualbarrelpants",
      shoes: "cscasualtabiflat",
      accessory: "cscasualcharmminibag",
      hair: "cscasualsleektuck",
    },
    recommendedTemplateId: "street-ootd-full",
    recommendedPoseId: "park-bench-crossed-talk",
    tags: ["casual", "street", "korea", "japan"],
    sourcePost: {
      account: "yeyedamei",
      shortcode: "De3R6OoE9wV",
      imageFile: "yeyedamei-instagram/posts/002_De3R6OoE9wV.jpg",
      framing: "full_body",
      shotType: "ootd_full_body",
      setting: "street_urban",
    },
  },
  {
    id: "combo-formunawei-tulle-scarf-cargo",
    nameEn: "Sheer Tulle Skinny Scarf & Buckle-Strap Cargos",
    nameZh: "透膚白薄紗細長頸巾配綁帶工裝闊褲",
    description:
      "Trend-forward Taipei/Seoul street capsule pairing a charcoal V-neck crop top with loose buckle-strap parachute cargos, triple-velcro white sneaker flats, and a sheer tulle skinny neck scarf.",
    items: {
      top: "cscasualcharcoalvneck",
      pants: "cscasualstrappedcargo",
      shoes: "cscasualvelcrosneak",
      accessory: "cscasualtullescarf",
      hair: "cscasualsleektuck",
    },
    recommendedTemplateId: "street-knee-up",
    recommendedPoseId: "stylist-bag-showcase",
    tags: ["casual", "street", "korea"],
    sourcePost: {
      account: "formunawei",
      shortcode: "Dex9vFQEkSr",
      imageFile: "formunawei-instagram/posts/003_Dex9vFQEkSr.jpg",
      framing: "knee_up",
      shotType: "posed_portrait",
      setting: "street_urban",
    },
    extractedRaw: {
      top: "Charcoal Fitted V-Neck Crop Top",
      pants: "Loose Grey Strapped Cargo Pants",
      shoes: "White Velcro Strap Sneaker Flats",
      accessory: "Sheer White Tulle Skinny Scarf",
    },
  },
  {
    id: "combo-formunawei-court-racket-stride",
    nameEn: "Court-to-Street V-Neck Crop & Yellow Retro Sneakers",
    nameZh: "球場街頭炭灰 V 領短上衣配芥末黃德訓鞋",
    description:
      "Sporty athleisure look combining a charcoal athletic V-neck crop top with crisp white pleated court skort, mustard-yellow retro suede sneakers, and a canvas weekend tote.",
    items: {
      top: "cscasualcharcoalvneck",
      pants: "cssportpleatedskort",
      shoes: "cscasualyellowretro",
      accessory: "cscasualtotebag",
      hair: "cssportvisorbun",
    },
    recommendedTemplateId: "social-pickleball",
    recommendedPoseId: "sport-pickleball-ready",
    tags: ["athletic", "pickleball", "tennis", "casual", "summer"],
    sourcePost: {
      account: "formunawei",
      shortcode: "DebFysRywzi",
      imageFile: "formunawei-instagram/posts/007_DebFysRywzi.jpg",
      framing: "half_body",
      shotType: "candid_moment",
      setting: "gym_sport",
    },
  },
  {
    id: "combo-wtingv-floral-cami-butterfly",
    nameEn: "Watercolor Floral Cami & Silver Butterfly Chain",
    nameZh: "水彩藍碎花吊帶開襟衫配純銀蝴蝶項鍊",
    description:
      "Soft romantic evening bistro look featuring a pale-blue watercolor floral camisole under a slouchy cream knit cardigan, champagne satin mini skirt, and layered silver butterfly necklace.",
    items: {
      top: "cscasualfloralcamiset",
      pants: "cscasualchampagneskirt",
      shoes: "cscasualcrystalpumps",
      accessory: "cscasualbutterflychain",
      hair: "cscasualribbonbraid",
    },
    recommendedTemplateId: "cafe-night-flash-toast",
    recommendedPoseId: "bistro-fork-smile",
    tags: ["casual", "summer", "korea"],
    sourcePost: {
      account: "wtingv_",
      shortcode: "De19WPmy3Jg",
      imageFile: "wtingv_-instagram/posts/001_De19WPmy3Jg.jpg",
      framing: "upper_body",
      shotType: "posed_portrait",
      setting: "cafe_restaurant",
    },
    extractedRaw: {
      top: "Pale Blue Floral Camisole & Knit Cardigan",
      pants: "Champagne Satin Mini Skirt",
      shoes: "Black Slingback Kitten Heels",
      accessory: "Silver Butterfly & Star Layered Necklace",
    },
  },
  {
    id: "combo-j876my-olive-shacket-leopard",
    nameEn: "Olive Utility Shacket & Leopard Calf-Hair Flats",
    nameZh: "橄欖綠多袋工裝襯衫外套配豹紋馬毛平底鞋",
    description:
      "Eclectic Tokyo/Seoul vintage street combo pairing an oversized olive-drab canvas utility shacket and floral jacquard shorts with leopard calf-hair flats, white crew socks, and a cyan studded barrel bag.",
    items: {
      top: "cscasualoliveshacket",
      pants: "cscasualfloralshorts",
      shoes: "cscasualleopardflats",
      accessory: "cscasualstuddedbag",
      hair: "cscasualmicrofringe",
    },
    recommendedTemplateId: "street-ootd-full",
    recommendedPoseId: "tailored-pocket-stance",
    tags: ["casual", "street", "korea", "japan"],
    sourcePost: {
      account: "j876my",
      shortcode: "De1QqNECAQx",
      imageFile: "j876my-instagram/posts/001_De1QqNECAQx.jpg",
      framing: "full_body",
      shotType: "posed_portrait",
      setting: "travel_landmark",
    },
    extractedRaw: {
      top: "Olive Utility Safari Shacket",
      pants: "Floral Jacquard Knit Shorts",
      shoes: "Leopard Print Flat Shoes with White Socks",
      accessory: "Cyan Studded Leather Shoulder Bag",
    },
  },
  {
    id: "combo-j876my-inflight-cozy-knit",
    nameEn: "In-Flight Cozy Knit & Shearling Mini Boots",
    nameZh: "機艙窗邊漁夫麻花冷衫配羊羔毛短雪靴",
    description:
      "Cozy long-haul travel combination with an oversized cream Nordic cable-knit sweater, mocha lounge leggings, cream shearling platform mini boots with scrunched socks, and a black wool baker boy cap.",
    items: {
      top: "cscasualnordicknit",
      pants: "cscasualseamleggings",
      shoes: "cscasualshearlingboot",
      accessory: "cscasualbakerboycap",
      hair: "cscasualtopknot",
    },
    recommendedTemplateId: "travel-inflight-cabin",
    recommendedPoseId: "casual-inflight-curl",
    tags: ["casual", "lounge", "winter", "europe"],
    sourcePost: {
      account: "j876my",
      shortcode: "DeWyr3lk6Fx",
      imageFile: "j876my-instagram/posts/012_DeWyr3lk6Fx.jpg",
      framing: "knee_up",
      shotType: "candid_moment",
      setting: "transport",
    },
    extractedRaw: {
      top: "Cream Cable-Knit Sweater",
      pants: "Soft Knit Lounge Leggings",
      shoes: "Cream Suede Shearling Boots with White Socks",
      accessory: "Black Baker Boy Cap",
    },
  },
  {
    id: "combo-chloeceyi-car-golden-selfie",
    nameEn: "Golden-Hour Car Cabin Henley & Baker Boy Cap",
    nameZh: "車內夕陽逆光華夫格亨利衫配報童帽",
    description:
      "Relaxed golden-hour passenger seat look pairing a warm oatmeal waffle-knit henley and wide-leg linen trousers with wireless earbuds and a structured black baker boy cap.",
    items: {
      top: "cscasualhenley",
      pants: "cscasuallinenwide",
      shoes: "cscasualslipon",
      accessory: "cscasualairpods",
      hair: "cscasualclawclip",
    },
    recommendedTemplateId: "selfie-car-golden-hour",
    recommendedPoseId: "sunglasses-peek-tilt",
    tags: ["casual", "lounge", "street"],
    sourcePost: {
      account: "chloeceyi_",
      shortcode: "Def9ZEWRmcb",
      imageFile: "chloeceyi_-instagram/posts/002_Def9ZEWRmcb.jpg",
      framing: "upper_body",
      shotType: "arm_selfie",
      setting: "car",
    },
  },
  {
    id: "combo-natalieyuung-crimson-cardigan-cafe",
    nameEn: "Crimson Fine-Knit Cardigan & Pleated Olive Skirt",
    nameZh: "緋紅細針織開襟衫配橄欖綠百褶中長裙",
    description:
      "Warm editorial cafe portrait combining a vibrant crimson crewneck cardigan with an olive accordion pleated midi skirt, camel suede platform clogs, and a brushed tartan scarf.",
    items: {
      top: "cscasualredcardigan",
      pants: "cscasualolivepleat",
      shoes: "cscasualsuedeclog",
      accessory: "cscasualtartanscarf",
      hair: "cscasualsleektuck",
    },
    recommendedTemplateId: "cafe-chin-on-hand",
    recommendedPoseId: "seated-hand-to-chin-full",
    tags: ["casual", "lounge", "japan", "europe"],
    sourcePost: {
      account: "natalieyuung",
      shortcode: "DbV599mB4R9",
      imageFile: "natalieyuung-instagram/posts/001_DbV599mB4R9.jpg",
      framing: "half_body",
      shotType: "posed_portrait",
      setting: "cafe_restaurant",
    },
  },
  {
    id: "combo-maggielee2xys-cobalt-knit-flare",
    nameEn: "Cobalt-Blue Scoop Knit & Low-Rise Flare Trousers",
    nameZh: "寶藍修身細羅紋針織衫配低腰微喇長褲",
    description:
      "Sleek modern Hong Kong street look pairing a form-fitting royal cobalt-blue scoop-neck knit top with black drawstring low-rise flare trousers, split-toe tabi flats, and a silver butterfly chain.",
    items: {
      top: "cscasualcobaltknit",
      pants: "cscasualflarelounge",
      shoes: "cscasualtabiflat",
      accessory: "cscasualbutterflychain",
      hair: "cscasualsleektuck",
    },
    recommendedTemplateId: "street-knee-up",
    recommendedPoseId: "thumbs-in-belt-loops",
    tags: ["casual", "street", "korea", "hk"],
    sourcePost: {
      account: "maggielee2xys",
      shortcode: "DTsW3_nE6mG",
      imageFile: "maggielee2xys-instagram/posts/016_DTsW3_nE6mG.jpg",
      framing: "knee_up",
      shotType: "posed_portrait",
      setting: "street_urban",
    },
    extractedRaw: {
      top: "Cobalt Blue Fitted Knit Long-Sleeve",
      pants: "Black Low-Rise Flare Trousers",
      shoes: "Black Leather Tabi Flats",
      accessory: "Silver Layered Necklace",
    },
  },
  {
    id: "combo-pparadeee-chiffon-halter-pier",
    nameEn: "Pleated Chiffon Halter & Linen Wide-Leg Resort Look",
    nameZh: "淺米細褶雪紡削肩上衣配亞麻闊腳長褲",
    description:
      "Breezy golden-hour waterfront ensemble featuring an airy pleated light-beige chiffon halter top, sand-beige relaxed linen wide-leg trousers, cork two-strap sandals, and a quilted crescent bag.",
    items: {
      top: "cscasuallinenresort",
      pants: "cscasuallinenwide",
      shoes: "cscasualbirksandal",
      accessory: "cscasualpuffybag",
      hair: "cscasualsoftupdo",
    },
    recommendedTemplateId: "travel-yacht-deck",
    recommendedPoseId: "rooftop-ledge-lean",
    tags: ["casual", "summer", "sea", "europe"],
    sourcePost: {
      account: "pparadeee",
      shortcode: "DdaF0yQTw8c",
      imageFile: "pparadeee-instagram/posts/004_DdaF0yQTw8c.jpg",
      framing: "knee_up",
      shotType: "posed_portrait",
      setting: "beach_water",
    },
  },
  {
    id: "combo-pparadeee-halter-evening-terrace",
    nameEn: "Chiffon Halter Top & Champagne Satin Wrap Skirt",
    nameZh: "淺米細褶雪紡削肩上衣配香檳金緞面短裙",
    description:
      "Elevated evening terrace outfit pairing a fluid pleated beige chiffon halter top with a shimmering champagne-gold satin mini wrap skirt and crystal-embellished slingback heels.",
    items: {
      top: "cscasualchiffonhalter",
      pants: "cscasualchampagneskirt",
      shoes: "cscasualcrystalpumps",
      accessory: "cscasualcharmminibag",
      hair: "cscasualribbonbraid",
    },
    recommendedTemplateId: "branding-rooftop-terrace",
    recommendedPoseId: "rooftop-ledge-lean",
    tags: ["casual", "formal", "summer", "sea"],
    sourcePost: {
      account: "pparadeee",
      shortcode: "DdUNpVRT2-l",
      imageFile: "pparadeee-instagram/posts/007_DdUNpVRT2-l.jpg",
      framing: "knee_up",
      shotType: "posed_portrait",
      setting: "cafe_restaurant",
    },
  },
  {
    id: "combo-tammyytm-tatami-matcha-ribbon",
    nameEn: "Tatami Matcha Tearoom Raglan Tee & Organza Ribbon",
    nameZh: "榻榻米茶屋愛心插肩長袖配霧藍歐根紗髮帶",
    description:
      "Sweet Kyoto/Taipei tearoom look combining a baby-pink and white heart-embroidered raglan tee with a white tiered broderie mini skirt, dusty-blue organza hair ribbon, and cream canvas slip-ons.",
    items: {
      top: "cscasualraglanheart",
      pants: "cscasualtierlaceskirt",
      shoes: "cscasualslipon",
      accessory: "cscasualorganzabow",
      hair: "cscasualribbonbraid",
    },
    recommendedTemplateId: "cafe-holding-drink",
    recommendedPoseId: "casual-tatami-matcha-kneel",
    tags: ["casual", "lounge", "korea", "japan", "summer"],
    sourcePost: {
      account: "tammyy.tm",
      shortcode: "Ddi27-kH-YE",
      imageFile: "tammyy.tm-instagram/posts/018_Ddi27-kH-YE.jpg",
      framing: "knee_up",
      shotType: "posed_portrait",
      setting: "cafe_restaurant",
    },
    extractedRaw: {
      top: "Pink & White Raglan Long-Sleeve Tee",
      pants: "White Tiered Lace Mini Skirt",
      shoes: "Cream Canvas Slip-On Shoes",
      accessory: "Dusty-Blue Organza Hair Bow & Pearl Chain",
      hair: "Half-Up Waves with Organza Ribbon",
    },
  },
  {
    id: "combo-tammyytm-archery-club-sport",
    nameEn: "Indoor Archery Club Zip Jacket & Flare Lounge Pants",
    nameZh: "室內射箭館運動立領夾克配微喇瑜珈長褲",
    description:
      "Sleek indoor archery range outfit pairing a sculpted athletic zip track jacket with black low-rise drawstring flare trousers, triple-velcro white sneaker flats, and a sleek high ponytail.",
    items: {
      top: "cssporttrackjacket",
      pants: "cscasualflarelounge",
      shoes: "cscasualvelcrosneak",
      accessory: "cscasualairpods",
      hair: "cssporthighpony",
    },
    recommendedTemplateId: "social-sport",
    recommendedPoseId: "sport-archery-draw",
    tags: ["athletic", "casual", "yoga", "street"],
    sourcePost: {
      account: "tammyy.tm",
      shortcode: "De1Mg8tpuks",
      imageFile: "tammyy.tm-instagram/posts/003_De1Mg8tpuks.jpg",
      framing: "knee_up",
      shotType: "candid_moment",
      setting: "gym_sport",
    },
  },

  // ── Athletic / Pickleball / Tennis / Yoga / Climbing Accounts ──────────────
  {
    id: "combo-pickleball-peekaboo-rally",
    nameEn: "Peek-A-Boo Pickleball Court Polo & Pleated Skort",
    nameZh: "Peek-A-Boo 匹克球場立領運動衫配百褶短裙褲",
    description:
      "Signature outdoor pickleball tournament kit featuring a breathable tipped court polo tank, high-waisted pleated court skort with inner shorts, gum-sole court shoes, and a graphite paddle.",
    items: {
      top: "cssportcourtpolo",
      pants: "cssportpleatedskort",
      shoes: "cssportcourtshoe",
      accessory: "cssportpickleball",
      hair: "cssportvisorbun",
    },
    recommendedTemplateId: "social-pickleball",
    recommendedPoseId: "sport-pickleball-ready",
    tags: ["athletic", "pickleball", "tennis", "summer", "us"],
    sourcePost: {
      account: "pickleballcentral",
      shortcode: "DcKTPYlkcHY",
      imageFile: "pickleballcentral-instagram/posts/021_DcKTPYlkcHY.jpg",
      framing: "full_body",
      shotType: "ootd_full_body",
      setting: "gym_sport",
    },
  },
  {
    id: "combo-ppatour-pro-court-swing",
    nameEn: "PPA Tour Pro Sleeveless Polo & Two-in-One Shorts",
    nameZh: "PPA 巡迴賽無袖球衣配雙層運動短褲",
    description:
      "High-intensity match-day pickleball kit combining a moisture-wicking court polo with two-in-one compression-lined running shorts, low-top court trainers, and a carbon-fiber paddle.",
    items: {
      top: "cssportcourtpolo",
      pants: "cssportrunningshort",
      shoes: "cssportcourtshoe",
      accessory: "cssportpickleball",
      hair: "cssporthighpony",
    },
    recommendedTemplateId: "social-pickleball",
    recommendedPoseId: "sport-pickleball-swing",
    tags: ["athletic", "pickleball", "running", "summer", "us"],
    sourcePost: {
      account: "ppatour",
      shortcode: "De0cR9xR8r1",
      imageFile: "ppatour-instagram/posts/001_De0cR9xR8r1.jpg",
      framing: "full_body",
      shotType: "candid_moment",
      setting: "gym_sport",
    },
  },
  {
    id: "combo-wilson-country-club-cable",
    nameEn: "Wilson Heritage Cable-Knit V-Neck & Pleated Skort",
    nameZh: "網球俱樂部復古麻花 V 領毛衣配百褶網球裙",
    description:
      "Classic country-club court-side look pairing an ivory green-and-burgundy striped V-neck cable-knit tennis sweater with a crisp white pleated skort, court shoes, and a canvas racket tote.",
    items: {
      top: "cssportcablevneck",
      pants: "cssportpleatedskort",
      shoes: "cssportcourtshoe",
      accessory: "cssportrackettote",
      hair: "cssportvisorbun",
    },
    recommendedTemplateId: "social-country-club",
    recommendedPoseId: "sport-court-net-lean",
    tags: ["athletic", "tennis", "pickleball", "casual", "us"],
    sourcePost: {
      account: "wilson",
      shortcode: "DcQ81brDlqa",
      imageFile: "wilson-instagram/posts/019_DcQ81brDlqa.jpg",
      framing: "full_body",
      shotType: "posed_portrait",
      setting: "gym_sport",
    },
  },
  {
    id: "combo-aloyoga-studio-flow-set",
    nameEn: "Alo Studio Cropped Bra Tank & High-Waist Flare Leggings",
    nameZh: "Alo 瑜珈教室短版背心配高腰微喇瑜珈褲",
    description:
      "Sculpted studio yoga flow set with a seamless sage-green ribbed sports bra tank, matching high-waisted flare yoga leggings, grip socks with slides, and a rolled yoga mat strap.",
    items: {
      top: "cssportbratank",
      pants: "cssportyogaleggings",
      shoes: "cssportgripsocks",
      accessory: "cssportyogamat",
      hair: "cssportheadband",
    },
    recommendedTemplateId: "social-yoga-mat",
    recommendedPoseId: "sport-yoga-upward-salute",
    tags: ["athletic", "yoga", "lounge", "us"],
    sourcePost: {
      account: "aloyoga",
      shortcode: "Dd-YCudGv6B",
      imageFile: "aloyoga-instagram/posts/013_Dd-YCudGv6B.jpg",
      framing: "full_body",
      shotType: "posed_portrait",
      setting: "gym_sport",
    },
  },
  {
    id: "combo-aloyoga-sound-bath-meditation",
    nameEn: "Sound Bath Ribbed Lounge Set & Crystal Singing Bowl",
    nameZh: "頌缽靜心羅紋運動背心配修身慢跑褲",
    description:
      "Mindful sound-bath meditation outfit pairing a soft ribbed yoga bra tank with tapered technical joggers, studio grip socks, and a frosted quartz crystal singing bowl.",
    items: {
      top: "cssportbratank",
      pants: "cscasualjoggers",
      shoes: "cssportgripsocks",
      accessory: "cssportsingingbowl",
      hair: "cscasualtopknot",
    },
    recommendedTemplateId: "social-sound-bath",
    recommendedPoseId: "sport-sound-bath-sit",
    tags: ["yoga", "casual", "lounge", "us"],
    sourcePost: {
      account: "aloyoga",
      shortcode: "DeuFAMJm3F5",
      imageFile: "aloyoga-instagram/posts/002_DeuFAMJm3F5.jpg",
      framing: "knee_up",
      shotType: "posed_portrait",
      setting: "gym_sport",
    },
  },
  {
    id: "combo-lululemon-scuba-commute",
    nameEn: "Lululemon Scuba Half-Zip & Split-Hem Flare Leggings",
    nameZh: "Lululemon 立領半拉鍊衛衣配開衩微喇瑜珈褲",
    description:
      "Post-class coffee commute look featuring an oversized heather-grey Scuba funnel-neck half-zip hoodie over a sports tank, black split-hem flare leggings, and marathon carbon runners.",
    items: {
      top: "cssportscubahalfzip",
      pants: "cssportsplitflare",
      shoes: "cssportmarathon",
      accessory: "cssportgymduffel",
      hair: "cssporthighpony",
    },
    recommendedTemplateId: "social-yoga-mat",
    recommendedPoseId: "walk-coffee-bag-stride",
    tags: ["athletic", "yoga", "casual", "lounge", "us"],
    sourcePost: {
      account: "lululemon",
      shortcode: "De2k5n3xP1m",
      imageFile: "lululemon-instagram/posts/001_De2k5n3xP1m.jpg",
      framing: "full_body",
      shotType: "ootd_full_body",
      setting: "street_urban",
    },
  },
  {
    id: "combo-blackdiamond-bouldering-crag",
    nameEn: "Black Diamond Bouldering Windbreaker & Ripstop Pants",
    nameZh: "攀岩館拼色防風夾克配耐磨抱石長褲",
    description:
      "Vertical climbing kit combining an ultralight ripstop hooded windbreaker with gusseted bouldering pants, high-friction downturned climbing shoes, and a waist-belted chalk bag.",
    items: {
      top: "cssportwindbreaker",
      pants: "cssportclimbpants",
      shoes: "cssportclimbshoe",
      accessory: "cssportchalkbag",
      hair: "cssportbraid",
    },
    recommendedTemplateId: "social-climbing-wall",
    recommendedPoseId: "sport-climbing-overhang",
    tags: ["athletic", "climbing", "us"],
    sourcePost: {
      account: "blackdiamond",
      shortcode: "DerpENTFzt_",
      imageFile: "blackdiamond-instagram/posts/004_DerpENTFzt_.jpg",
      framing: "full_body",
      shotType: "candid_moment",
      setting: "gym_sport",
    },
  },
  {
    id: "combo-sportyandrich-country-club-sweat",
    nameEn: "Sporty & Rich Collegiate Crest Sweatshirt & Burgundy Sweats",
    nameZh: "Sporty & Rich 學院徽章衛衣配酒紅束口棉褲",
    description:
      "Relaxed country-club off-duty uniform pairing a forest-green collegiate crest crewneck layered over a striped oxford shirt with deep burgundy fleece sweatpants and retro suede sneakers.",
    items: {
      top: "cscasualcrestsweat",
      pants: "cscasualburgundysweat",
      shoes: "cscasualredretro",
      accessory: "cssportrackettote",
      hair: "cscasualclawclip",
    },
    recommendedTemplateId: "social-country-club",
    recommendedPoseId: "park-bench-crossed-talk",
    tags: ["casual", "lounge", "athletic", "tennis", "us"],
    sourcePost: {
      account: "sportyandrich",
      shortcode: "De0xK8mR2vL",
      imageFile: "sportyandrich-instagram/posts/001_De0xK8mR2vL.jpg",
      framing: "full_body",
      shotType: "ootd_full_body",
      setting: "nature_park",
    },
  },

  // ── Casual Lookbook Accounts (COS, ARKET, Uniqlo, Muji) ────────────────────
  {
    id: "combo-cosstores-draped-scarf-coat",
    nameEn: "COS Architectural Scarf Coat & Barrel Utility Pants",
    nameZh: "COS 圍巾領立體羊毛短大衣配米白繭型闊褲",
    description:
      "Minimalist European architectural lookbook pairing a charcoal-taupe wool coat with an integrated draped scarf collar, off-white barrel utility trousers, and split-toe leather tabi flats.",
    items: {
      top: "cscasualscarfcoat",
      pants: "cscasualbarrelpants",
      shoes: "cscasualtabiflat",
      accessory: "cscasualpuffybag",
      hair: "cscasualsleektuck",
    },
    recommendedTemplateId: "street-minimal-lookbook",
    recommendedPoseId: "casual-wainscot-clutch-lean",
    tags: ["casual", "street", "winter", "europe"],
    sourcePost: {
      account: "cosstores",
      shortcode: "Dev4oS_CChW",
      imageFile: "cosstores-instagram/posts/003_Dev4oS_CChW.jpg",
      framing: "full_body",
      shotType: "ootd_full_body",
      setting: "studio_plain_wall",
    },
  },
  {
    id: "combo-arket-nordic-corduroy-lounge",
    nameEn: "ARKET Houndstooth Blouson & Chocolate Wide Corduroys",
    nameZh: "ARKET 千鳥格羊毛短夾克配巧克力棕燈芯絨闊褲",
    description:
      "Scandinavian autumn lounge outfit featuring a boxy brown-and-cream houndstooth wool blouson, chocolate pleated wide-leg corduroy trousers, camel suede clogs, and a tartan mohair scarf.",
    items: {
      top: "cscasualhoundstooth",
      pants: "cscasualcorduroywide",
      shoes: "cscasualsuedeclog",
      accessory: "cscasualtartanscarf",
      hair: "cscasualmicrofringe",
    },
    recommendedTemplateId: "home-sofa-lounge",
    recommendedPoseId: "casual-armchair-curl",
    tags: ["casual", "lounge", "winter", "europe"],
    sourcePost: {
      account: "arketofficial",
      shortcode: "Ded53j3Drgj",
      imageFile: "arketofficial-instagram/posts/008_Ded53j3Drgj.jpg",
      framing: "full_body",
      shotType: "posed_portrait",
      setting: "home_living",
    },
  },
  {
    id: "combo-uniqlo-tokyo-weekend-stripe",
    nameEn: "Uniqlo Tokyo Breton Stripe Tee & Soft Khaki Cargos",
    nameZh: "Uniqlo 東京週末條紋 Tee 配水洗卡其工裝褲",
    description:
      "Effortless Tokyo weekend stroll outfit pairing an oversized navy-and-ecru Breton stripe cotton tee with soft washed khaki cargo pants, cream canvas slip-ons, and a quilted puffy crescent bag.",
    items: {
      top: "cscasualtokyostripe",
      pants: "cscasualcargo",
      shoes: "cscasualslipon",
      accessory: "cscasualpuffybag",
      hair: "cscasualmicrofringe",
    },
    recommendedTemplateId: "street-casual-weekend",
    recommendedPoseId: "walk-coffee-bag-stride",
    tags: ["casual", "street", "japan"],
    sourcePost: {
      account: "uniqlo",
      shortcode: "De1nL4pT9xQ",
      imageFile: "uniqlo-instagram/posts/001_De1nL4pT9xQ.jpg",
      framing: "full_body",
      shotType: "ootd_full_body",
      setting: "street_urban",
    },
  },
  {
    id: "combo-muji-natural-linen-serenity",
    nameEn: "MUJI Oatmeal Waffle Henley & Linen Wide-Leg Trousers",
    nameZh: "MUJI 燕麥色華夫格亨利衫配亞麻闊腳長褲",
    description:
      "Calm Japanese natural-fiber uniform combining a relaxed oatmeal waffle-knit henley with breathable sand-beige linen wide-leg trousers, cork two-strap sandals, and a heavy canvas tote.",
    items: {
      top: "cscasualhenley",
      pants: "cscasuallinenwide",
      shoes: "cscasualbirksandal",
      accessory: "cscasualtotebag",
      hair: "cscasualclawclip",
    },
    recommendedTemplateId: "home-window-light",
    recommendedPoseId: "standing-arms-relaxed",
    tags: ["casual", "lounge", "japan", "summer"],
    sourcePost: {
      account: "muji_global",
      shortcode: "De0pW7kM3zR",
      imageFile: "muji_global-instagram/posts/001_De0pW7kM3zR.jpg",
      framing: "full_body",
      shotType: "posed_portrait",
      setting: "home_living",
    },
  },

  // ── Personal Branding & Styling Creators ───────────────────────────────────
  {
    id: "combo-amendalee-tweed-bootcut-mirror",
    nameEn: "Amenda Lee Cropped Tweed Jacket & High-Waist Bootcut Jeans",
    nameZh: "Amenda 小香風短版毛呢外套配高腰微喇牛仔褲",
    description:
      "Signature Hong Kong smart-casual boutique look pairing an ivory-and-black cropped tweed jacket with dark-indigo high-waisted bootcut jeans, two-tone slingback heels, and a quilted chain bag.",
    items: {
      top: "csamendatweedcrop",
      pants: "csamendabootcutjean",
      shoes: "csamendaslingback",
      accessory: "csamendaquiltedbag",
      hair: "csamendawaves",
    },
    recommendedTemplateId: "branding-boutique-mirror",
    recommendedPoseId: "boutique-mirror-full",
    tags: ["casual", "formal", "branding", "hk"],
    sourcePost: {
      account: "amenda.lee_",
      shortcode: "DVbG2t6zM1w",
      imageFile: "amenda-lee-instagram/posts/001.jpg",
      framing: "full_body",
      shotType: "mirror_selfie",
      setting: "shop_mall",
    },
  },
  {
    id: "combo-chrisdo-founder-keynote-black",
    nameEn: "Founder Monochrome Mock-Neck & Tailored Pleated Trousers",
    nameZh: "創辦人極簡黑高領毛衣配打褶西裝寬褲",
    description:
      "High-authority founder studio look combining a fine-gauge matte-black merino mock-neck sweater under a structured blazer with charcoal pleated trousers, minimalist leather sneakers, and a lapel mic.",
    items: {
      top: "csbrandmockneck",
      pants: "csbrandpleattrouser",
      shoes: "csbrandcourtsneaker",
      accessory: "csbrandlapelmic",
      hair: "csbrandfounderwave",
    },
    recommendedTemplateId: "branding-founder-desk",
    recommendedPoseId: "founder-desk-gesture",
    tags: ["branding", "formal", "us"],
    sourcePost: {
      account: "thechrisdo",
      shortcode: "De1rT9wK4mP",
      imageFile: "thechrisdo-instagram/posts/001_De1rT9wK4mP.jpg",
      framing: "half_body",
      shotType: "talking_head",
      setting: "office_work",
    },
  },
  {
    id: "combo-allisonbornstein-three-word-trench",
    nameEn: "Three-Word Method Belted Trench & Raw-Denim Straight Jeans",
    nameZh: "造型師經典雙排扣風衣配原色直筒牛仔褲",
    description:
      "New York personal stylist uniform pairing a honey-beige double-breasted trench coat over a crisp poplin shirt with straight-leg vintage denim, penny loafers, and a structured leather tote.",
    items: {
      top: "csstyletrenchcoat",
      pants: "csstylestraightjean",
      shoes: "csstylepennyloafer",
      accessory: "csstyleleathertote",
      hair: "csstylefrenchbob",
    },
    recommendedTemplateId: "branding-closet-guide",
    recommendedPoseId: "closet-mic-present",
    tags: ["branding", "casual", "street", "us", "europe"],
    sourcePost: {
      account: "allisonbornstein6",
      shortcode: "De0vN6sL8qW",
      imageFile: "allisonbornstein6-instagram/posts/001_De0vN6sL8qW.jpg",
      framing: "full_body",
      shotType: "talking_head",
      setting: "home_living",
    },
  },
  {
    id: "combo- LydiaToh-silk-slip-blazer",
    nameEn: "Oversized Espresso Blazer & Bias-Cut Satin Midi Skirt",
    nameZh: "寬鬆濃縮咖啡棕西裝外套配斜裁緞面中長裙",
    description:
      "Polished stylist capsule combining an oversized espresso-brown wool blazer with a fluid champagne bias-cut satin midi skirt, pointed-toe kitten heels, and sculptural gold hoop earrings.",
    items: {
      top: "csstylewoolblazer",
      pants: "csstylesatinskirt",
      shoes: "csstylekittenheel",
      accessory: "csstylegoldhoops",
      hair: "csstylesleekbun",
    },
    recommendedTemplateId: "branding-rack-showcase",
    recommendedPoseId: "stylist-bag-showcase",
    tags: ["branding", "formal", "street", "europe"],
    sourcePost: {
      account: "lydiajanetoh",
      shortcode: "De1gH2jK9pL",
      imageFile: "lydiajanetoh-instagram/posts/001_De1gH2jK9pL.jpg",
      framing: "full_body",
      shotType: "ootd_full_body",
      setting: "home_living",
    },
  },
];

function resolveValidPostFile(account: string, preferredFile: string, rowsByAccount: Map<string, ExtractedPostRow[]>): {
  file: string;
  shortcode: string;
} {
  const fullPreferred = path.join(EXPERIMENTS_DIR, preferredFile);
  if (fs.existsSync(fullPreferred)) {
    const m = path.basename(preferredFile, ".jpg").split("_");
    return { file: preferredFile, shortcode: m.length > 1 ? m.slice(1).join("_") : m[0] };
  }
  const accRows = rowsByAccount.get(account);
  if (accRows && accRows.length > 0) {
    const fb = path.basename(accRows[0].file, path.extname(accRows[0].file));
    const fp = fb.split("_");
    return {
      file: accRows[0].file,
      shortcode: accRows[0].shortcode || (fp.length > 1 ? fp.slice(1).join("_") : fb),
    };
  }
  const postsDir = path.join(EXPERIMENTS_DIR, `${account.replace(/\./g, "-")}-instagram`, "posts");
  const altDir = path.join(EXPERIMENTS_DIR, `${account}-instagram`, "posts");
  for (const dir of [altDir, postsDir]) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort();
      if (files.length > 0) {
        const rel = path.relative(EXPERIMENTS_DIR, path.join(dir, files[0]));
        const base = path.basename(files[0], ".jpg");
        const parts = base.split("_");
        return { file: rel, shortcode: parts.length > 1 ? parts.slice(1).join("_") : base };
      }
    }
  }
  return { file: preferredFile, shortcode: "post001" };
}

function main() {
  const rawLines = fs
    .readFileSync(EXTRACTIONS_PATH, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  const extractedRows: ExtractedPostRow[] = rawLines.map((l) => JSON.parse(l) as ExtractedPostRow);

  const rowsByAccount = new Map<string, ExtractedPostRow[]>();
  for (const row of extractedRows) {
    const list = rowsByAccount.get(row.account) ?? [];
    list.push(row);
    rowsByAccount.set(row.account, list);
  }

  // 1. Map all 1,352 extracted rows + 24 amenda.lee_ rows to full WardrobeCombination records
  const allMappedCombinations: WardrobeCombination[] = [];

  for (const row of extractedRows) {
    const topId = matchBestCatalogOption(row.top, row.account, CHARACTER_TOPS, "cscasualhenley");
    const pantsId = matchBestCatalogOption(row.pants, row.account, CHARACTER_PANTS, "cscasuallinenwide");
    const shoesId = matchBestCatalogOption(row.shoes, row.account, CHARACTER_SHOES, "cscasualslipon");
    const accessoryId = matchBestCatalogOption(
      row.accessory,
      row.account,
      CHARACTER_ACCESSORIES,
      "cscasualtotebag",
    );
    const hairId = matchBestCatalogOption(
      row.hair,
      row.account,
      CHARACTER_HAIRSTYLES,
      "cscasualclawclip",
    );
    const templateId = inferTemplateId(row);
    const poseId = inferPoseId(row);
    const tags = collectComboTags(topId, pantsId, shoesId, accessoryId);

    const fileBase = path.basename(row.file, path.extname(row.file));
    const fileParts = fileBase.split("_");
    const shortcode = row.shortcode || (fileParts.length > 1 ? fileParts.slice(1).join("_") : fileBase);
    const slugAccount = row.account.toLowerCase().replace(/[^a-z0-9]/g, "");
    const slugCode = shortcode.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "post";

    const combo: WardrobeCombination = {
      id: `ig-${slugAccount}-${slugCode}`,
      nameEn: `${row.top.labelEn} & ${row.pants.labelEn}`,
      nameZh: `${row.top.labelZhHant}配${row.pants.labelZhHant}`,
      description: `Distilled from @${row.account} (${row.setting.replace(/_/g, " ")}, ${row.shotType.replace(/_/g, " ")}): ${row.top.labelEn} paired with ${row.pants.labelEn}, ${row.shoes.labelEn}, and ${row.accessory.labelEn}.`,
      items: {
        top: topId,
        pants: pantsId,
        shoes: shoesId,
        accessory: accessoryId,
        hair: hairId,
      },
      recommendedTemplateId: templateId,
      recommendedPoseId: poseId,
      tags,
      sourcePost: {
        account: row.account,
        shortcode,
        imageFile: row.file,
        framing: normalizeFraming(row.framing),
        shotType: normalizeShotType(row.shotType),
        setting: normalizeSetting(row.setting),
      },
      extractedRaw: {
        top: row.top.labelEn,
        pants: row.pants.labelEn,
        shoes: row.shoes.labelEn,
        accessory: row.accessory.labelEn,
        hair: row.hair.labelEn,
      },
    };

    WardrobeCombinationSchema.parse(combo);
    allMappedCombinations.push(combo);
  }

  fs.writeFileSync(
    OUT_JSONL_PATH,
    allMappedCombinations.map((c) => JSON.stringify(c)).join("\n") + "\n",
    "utf8",
  );
  console.log(`Wrote ${allMappedCombinations.length} full IG post combinations to ${OUT_JSONL_PATH}`);

  // 2. Build the curated catalog: start with our hand-verified CURATED_COMBINATIONS, then ensure
  // every single downloaded account in `extractedRows` has at least one representative combination in `WARDROBE_COMBINATIONS`.
  const validTopIds = new Set(CHARACTER_TOPS.map((o) => o.id));
  const validPantsIds = new Set(CHARACTER_PANTS.map((o) => o.id));
  const validShoesIds = new Set(CHARACTER_SHOES.map((o) => o.id));
  const validAccessoryIds = new Set(CHARACTER_ACCESSORIES.map((o) => o.id));
  const validHairIds = new Set(CHARACTER_HAIRSTYLES.map((o) => o.id));
  const validTemplateIds = new Set(LIFE_POST_TEMPLATES.map((t) => t.id));
  const validPoseIds = new Set(LIFE_POSES.map((p) => p.id));

  const curatedList: WardrobeCombination[] = [];
  const coveredAccounts = new Set<string>();

  for (const rawCurated of CURATED_COMBINATIONS) {
    const resolved = resolveValidPostFile(
      rawCurated.sourcePost.account,
      rawCurated.sourcePost.imageFile,
      rowsByAccount,
    );
    const combo: WardrobeCombination = {
      ...rawCurated,
      id: rawCurated.id.trim().replace(/\s+/g, "").toLowerCase(),
      items: {
        top: validTopIds.has(rawCurated.items.top) ? rawCurated.items.top : "cscasualhenley",
        pants: validPantsIds.has(rawCurated.items.pants) ? rawCurated.items.pants : "cscasuallinenwide",
        shoes: validShoesIds.has(rawCurated.items.shoes) ? rawCurated.items.shoes : "cscasualslipon",
        accessory: validAccessoryIds.has(rawCurated.items.accessory)
          ? rawCurated.items.accessory
          : "cscasualtotebag",
        hair:
          rawCurated.items.hair && validHairIds.has(rawCurated.items.hair)
            ? rawCurated.items.hair
            : "cscasualclawclip",
      },
      recommendedTemplateId:
        rawCurated.recommendedTemplateId && validTemplateIds.has(rawCurated.recommendedTemplateId)
          ? rawCurated.recommendedTemplateId
          : "street-ootd-full",
      recommendedPoseId:
        rawCurated.recommendedPoseId && validPoseIds.has(rawCurated.recommendedPoseId)
          ? rawCurated.recommendedPoseId
          : "stylist-bag-showcase",
      sourcePost: {
        ...rawCurated.sourcePost,
        imageFile: resolved.file,
        shortcode: resolved.shortcode,
      },
    };
    WardrobeCombinationSchema.parse(combo);
    curatedList.push(combo);
    coveredAccounts.add(combo.sourcePost.account);
  }

  // Add the top full-body/knee-up post from each remaining account so all 51 accounts are represented
  for (const [account, rows] of rowsByAccount.entries()) {
    if (coveredAccounts.has(account)) continue;
    const bestRow =
      rows.find((r) => r.framing === "full_body" && r.top.visible && r.pants.visible) ??
      rows.find((r) => r.framing === "knee_up" && r.top.visible) ??
      rows[0];
    if (!bestRow) continue;

    const mapped = allMappedCombinations.find(
      (c) =>
        c.sourcePost.account === bestRow.account && c.sourcePost.imageFile === bestRow.file,
    );
    if (mapped) {
      curatedList.push(mapped);
      coveredAccounts.add(account);
    }
  }

  const tsSource = `// Auto-generated by scripts/experiments/build-wardrobe-combinations.ts — DO NOT EDIT MANUALLY.
// Curated & validated outfit combinations (cloth: top + pants, shoe: shoes, accessory, hair)
// distilled from ${allMappedCombinations.length} downloaded Instagram post images across ${coveredAccounts.size} accounts.

import type { WardrobeCombination } from "@/model/wardrobe-combination";

export const WARDROBE_COMBINATIONS: readonly WardrobeCombination[] = ${JSON.stringify(
    curatedList,
    null,
    2,
  )};
`;

  fs.writeFileSync(OUT_DATA_TS_PATH, tsSource, "utf8");
  console.log(
    `Wrote ${curatedList.length} curated combinations across ${coveredAccounts.size} accounts to ${OUT_DATA_TS_PATH}`,
  );
}

main();
