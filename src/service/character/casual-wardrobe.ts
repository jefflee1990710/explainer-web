// Casual & lounge fashion distilled from global street / lifestyle tastes:
// Tokyo/Seoul everyday, Mediterranean linen, Nordic hygge knits, HK cha-chaan-teng smart-casual,
// LA athleisure, and soft weekend looks. Complements sports + branding catalogs.
// Each prompt ends with "Isolated wardrobe piece <id>." so detection matches uniquely.
import type { CharacterLookOption } from "@/service/character/character-look";

export const CASUAL_HAIR: readonly CharacterLookOption[] = [
  {
    id: "cscasualclawclip",
    description: "Messy claw-clip half-up hairstyle for casual weekends.",
    tags: ["casual", "lounge", "summer", "korea"],
    prompt:
      "Effortless half-up hair secured with a matte tortoiseshell claw clip, soft face-framing strands left loose around the cheeks. Isolated wardrobe piece cscasualclawclip.",
  },
  {
    id: "cscasualtopknot",
    description: "Soft messy top knot for gym-to-cafe days.",
    tags: ["casual", "athletic", "lounge"],
    prompt:
      "Relaxed high messy top knot with wispy baby hairs at the hairline and a soft unfinished texture. Isolated wardrobe piece cscasualtopknot.",
  },
];

export const CASUAL_TOPS: readonly CharacterLookOption[] = [
  {
    id: "cscasualhenley",
    description: "Soft oatmeal waffle henley for everyday casual wear.",
    tags: ["casual", "lounge", "us"],
    prompt:
      "Soft oatmeal waffle-knit long-sleeve henley shirt with a three-button placket and gently relaxed everyday fit. Isolated wardrobe piece cscasualhenley.",
  },
  {
    id: "cscasuallinenresort",
    description: "Mediterranean open-collar linen resort shirt.",
    tags: ["casual", "summer", "europe", "latin"],
    prompt:
      "Breathable sand-beige Mediterranean open-collar linen resort shirt with mother-of-pearl buttons and a soft boxy drape. Isolated wardrobe piece cscasuallinenresort.",
  },
  {
    id: "cscasualseoulfleece",
    description: "Seoul everyday oversized fleece half-zip.",
    tags: ["casual", "street", "korea", "winter"],
    prompt:
      "Seoul everyday oversized heather-grey fleece half-zip pullover with a stand collar and clean minimal branding. Isolated wardrobe piece cscasualseoulfleece.",
  },
  {
    id: "cscasualhkpolo",
    description: "Hong Kong smart-casual piqué polo.",
    tags: ["casual", "formal", "sea"],
    prompt:
      "Crisp navy Hong Kong cha-chaan-teng smart-casual cotton piqué polo with a neat rib collar and slim everyday silhouette. Isolated wardrobe piece cscasualhkpolo.",
  },
  {
    id: "cscasualnordicknit",
    description: "Nordic cream fisherman knit sweater.",
    tags: ["casual", "lounge", "winter", "europe"],
    prompt:
      "Chunky cream Nordic fisherman cable-knit crew sweater with a cozy hygge lounge silhouette. Isolated wardrobe piece cscasualnordicknit.",
  },
  {
    id: "cscasualtokyostripe",
    description: "Tokyo casual Breton stripe long-sleeve tee.",
    tags: ["casual", "japan", "summer"],
    prompt:
      "Tokyo weekend navy-and-cream Breton stripe long-sleeve tee with a relaxed crew neck and soft cotton jersey. Isolated wardrobe piece cscasualtokyostripe.",
  },
  {
    id: "cscasualyogaotton",
    description: "Soft sage oversized yoga-to-street cotton tee.",
    tags: ["casual", "yoga", "athletic", "lounge"],
    prompt:
      "Soft dusty-sage oversized drop-shoulder cotton tee designed for yoga-to-cafe transitions with a gently curved hem. Isolated wardrobe piece cscasualyogaotton.",
  },
];

export const CASUAL_PANTS: readonly CharacterLookOption[] = [
  {
    id: "cscasualjoggers",
    description: "Heather grey tapered everyday joggers.",
    tags: ["casual", "lounge", "athletic"],
    prompt:
      "Soft heather-grey tapered loopback joggers with an elastic cuff and minimal drawstring waist for everyday casual wear. Isolated wardrobe piece cscasualjoggers.",
  },
  {
    id: "cscasuallinenwide",
    description: "Stone linen wide-leg summer trousers.",
    tags: ["casual", "summer", "europe"],
    prompt:
      "Relaxed stone-washed linen wide-leg trousers with a soft paper-bag waist and breezy Mediterranean drape. Isolated wardrobe piece cscasuallinenwide.",
  },
  {
    id: "cscasualcargo",
    description: "Soft khaki utility cargo pants for street casual.",
    tags: ["casual", "street"],
    prompt:
      "Soft washed khaki everyday cargo pants with flat flap pockets and a slightly tapered ankle for city weekend wear. Isolated wardrobe piece cscasualcargo.",
  },
  {
    id: "cscasualseamleggings",
    description: "Butter-soft mocha lounge seam leggings.",
    tags: ["casual", "yoga", "lounge", "athletic"],
    prompt:
      "Butter-soft mocha high-waisted lounge leggings with a subtle center seam and matte stretch fabric for yoga and errands. Isolated wardrobe piece cscasualseamleggings.",
  },
];

export const CASUAL_SHOES: readonly CharacterLookOption[] = [
  {
    id: "cscasualslipon",
    description: "Cream canvas everyday slip-on sneakers.",
    tags: ["casual", "summer"],
    prompt:
      "Cream canvas everyday slip-on sneakers with a vulcanized gum sole and soft elastic side gores. Isolated wardrobe piece cscasualslipon.",
  },
  {
    id: "cscasualcloudrunner",
    description: "Chunky cloud-foam casual running sneakers.",
    tags: ["casual", "athletic", "running"],
    prompt:
      "Chunky off-white cloud-foam casual runners with a soft sock collar and everyday lifestyle cushioning. Isolated wardrobe piece cscasualcloudrunner.",
  },
  {
    id: "cscasualbirksandal",
    description: "Cork-footbed casual two-strap sandals.",
    tags: ["casual", "summer", "europe"],
    prompt:
      "Warm taupe two-strap cork-footbed casual sandals with soft suede straps for weekend summer walks. Isolated wardrobe piece cscasualbirksandal.",
  },
];

export const CASUAL_ACCESSORIES: readonly CharacterLookOption[] = [
  {
    id: "cscasualbeanie",
    description: "Soft ribbed everyday beanie.",
    tags: ["casual", "winter", "street"],
    prompt:
      "Soft charcoal ribbed everyday beanie worn loosely with a casual folded cuff. Isolated wardrobe piece cscasualbeanie.",
  },
  {
    id: "cscasualtotebag",
    description: "Canvas weekend tote bag.",
    tags: ["casual", "summer", "street"],
    prompt:
      "Slouchy natural canvas weekend tote bag with long shoulder straps and minimal stitching detail. Isolated wardrobe piece cscasualtotebag.",
  },
  {
    id: "cscasualairpods",
    description: "Wireless earbuds case worn as a casual accessory.",
    tags: ["casual", "street"],
    prompt:
      "Matte white wireless earbud charging case clipped casually to a pocket or held in hand as a modern everyday accessory. Isolated wardrobe piece cscasualairpods.",
  },
];

export const CASUAL_LABELS_EN = {
  hair: {
    cscasualclawclip: "Claw-Clip Half-Up",
    cscasualtopknot: "Messy Casual Top Knot",
  },
  top: {
    cscasualhenley: "Oatmeal Waffle Henley",
    cscasuallinenresort: "Linen Resort Shirt",
    cscasualseoulfleece: "Seoul Fleece Half-Zip",
    cscasualhkpolo: "HK Smart-Casual Polo",
    cscasualnordicknit: "Nordic Fisherman Knit",
    cscasualtokyostripe: "Tokyo Breton Stripe Tee",
    cscasualyogaotton: "Yoga-to-Street Cotton Tee",
  },
  pants: {
    cscasualjoggers: "Everyday Tapered Joggers",
    cscasuallinenwide: "Linen Wide-Leg Trousers",
    cscasualcargo: "Soft Khaki Cargo Pants",
    cscasualseamleggings: "Mocha Lounge Leggings",
  },
  shoes: {
    cscasualslipon: "Cream Canvas Slip-Ons",
    cscasualcloudrunner: "Cloud-Foam Casual Runners",
    cscasualbirksandal: "Cork Two-Strap Sandals",
  },
  accessory: {
    cscasualbeanie: "Ribbed Everyday Beanie",
    cscasualtotebag: "Canvas Weekend Tote",
    cscasualairpods: "Wireless Earbud Case",
  },
} as const;

export const CASUAL_LABELS_ZH = {
  hair: {
    cscasualclawclip: "龜夾半紮隨性髮型",
    cscasualtopknot: "鬆散隨性高丸子頭",
  },
  top: {
    cscasualhenley: "燕麥色華夫格亨利衫",
    cscasuallinenresort: "地中海亞麻度假襯衫",
    cscasualseoulfleece: "首爾日常抓毛半拉鍊",
    cscasualhkpolo: "香港 Smart Casual Polo",
    cscasualnordicknit: "北歐漁夫麻花冷衫",
    cscasualtokyostripe: "東京週末布列塔尼條紋 Tee",
    cscasualyogaotton: "瑜珈通勤寬鬆棉 Tee",
  },
  pants: {
    cscasualjoggers: "日常修腳運動棉褲",
    cscasuallinenwide: "亞麻闊腳長褲",
    cscasualcargo: "水洗卡其休閒工裝褲",
    cscasualseamleggings: "摩卡色居家瑜珈legging",
  },
  shoes: {
    cscasualslipon: "米白帆布懶人鞋",
    cscasualcloudrunner: "雲感厚底休閒跑鞋",
    cscasualbirksandal: "軟木雙帶涼鞋",
  },
  accessory: {
    cscasualbeanie: "羅紋日常冷帽",
    cscasualtotebag: "帆布週末托特包",
    cscasualairpods: "無線耳機充電盒",
  },
} as const;
