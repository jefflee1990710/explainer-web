// Casual & lounge fashion distilled from global street / lifestyle tastes:
// Tokyo/Seoul everyday, Mediterranean linen, Nordic hygge knits, HK cha-chaan-teng smart-casual,
// LA athleisure, and soft weekend looks, plus IG research from Uniqlo, COS, ARKET, Sporty & Rich, and Varley.
// Complements sports + branding catalogs.
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
  {
    id: "cscasualsleektuck",
    description: "Straight center-parted hair tucked cleanly behind both ears (distilled from ARKET).",
    tags: ["casual", "formal", "europe"],
    prompt:
      "Sleek straight medium-brown hair parted cleanly down the middle and tucked smoothly behind both ears with a natural satin sheen. Isolated wardrobe piece cscasualsleektuck.",
  },
  {
    id: "cscasualmicrofringe",
    description: "Short textured crop with soft disheveled micro fringe (distilled from ARKET).",
    tags: ["casual", "street", "europe"],
    prompt:
      "Short brown hair styled forward with natural airy texture, a slightly disheveled micro fringe above the brows, and a clean matte finish. Isolated wardrobe piece cscasualmicrofringe.",
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
  {
    id: "cscasualcrestsweat",
    description: "Cream collegiate crest sweatshirt layered over a crisp collared shirt (distilled from Sporty & Rich).",
    tags: ["casual", "street", "us", "europe"],
    prompt:
      "Oversized cream heavyweight cotton crewneck sweatshirt with navy collegiate crest typography, layered neatly over a crisp white button-down shirt collar. Isolated wardrobe piece cscasualcrestsweat.",
  },
  {
    id: "cscasualsherpapuffer",
    description: "Rust-brown quilted down puffer jacket with a sherpa fleece collar (distilled from Varley).",
    tags: ["casual", "lounge", "winter", "europe"],
    prompt:
      "Oversized rust-brown quilted down puffer jacket featuring wide horizontal baffles and an exaggerated spread collar lined in plush cream sherpa fleece. Isolated wardrobe piece cscasualsherpapuffer.",
  },
  {
    id: "cscasualscarfcoat",
    description: "Architectural charcoal wool short coat with integrated draped scarf lapel (distilled from COS).",
    tags: ["casual", "formal", "winter", "europe"],
    prompt:
      "Architectural heavyweight charcoal-black wool short coat featuring an integrated draped scarf lapel, dropped shoulders, and a clean minimalist boxy cut. Isolated wardrobe piece cscasualscarfcoat.",
  },
  {
    id: "cscasualhoundstooth",
    description: "Relaxed houndstooth wool blouson jacket with dual flap pockets (distilled from Uniqlo & ARKET).",
    tags: ["casual", "street", "japan", "korea", "winter"],
    prompt:
      "Structured houndstooth checked wool blouson jacket in charcoal and warm beige with a pointed shirt collar, dual buttoned front flap pockets, and a softly elasticated hem. Isolated wardrobe piece cscasualhoundstooth.",
  },
  {
    id: "cscasualredcardigan",
    description: "Vibrant crimson fine-gauge crewneck cardigan sweater (distilled from Uniqlo).",
    tags: ["casual", "lounge", "japan", "europe"],
    prompt:
      "Vibrant crimson-red fine-gauge knit crewneck cardigan sweater featuring tonal front buttons and neat ribbed detailing at the collar, cuffs, and hem. Isolated wardrobe piece cscasualredcardigan.",
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
  {
    id: "cscasualbarrelpants",
    description: "Off-white high-waisted barrel-leg cotton twill utility trousers (distilled from Uniqlo).",
    tags: ["casual", "street", "japan"],
    prompt:
      "High-waisted relaxed off-white utility trousers with a sculptural wide barrel-leg cut in crisp heavyweight cotton twill. Isolated wardrobe piece cscasualbarrelpants.",
  },
  {
    id: "cscasualcorduroywide",
    description: "Chocolate-brown pleated wide-leg corduroy trousers (distilled from Varley).",
    tags: ["casual", "lounge", "winter", "europe"],
    prompt:
      "High-waisted chocolate-brown wide-leg trousers crafted from plush fine-wale corduroy with front pleats and a fluid floor-skimming drape. Isolated wardrobe piece cscasualcorduroywide.",
  },
  {
    id: "cscasualolivepleat",
    description: "Olive-green A-line accordion-pleated midi skirt (distilled from Uniqlo).",
    tags: ["casual", "formal", "japan", "korea"],
    prompt:
      "A-line deep olive-green woven midi skirt featuring crisp vertical accordion pleats that move fluidly with every step. Isolated wardrobe piece cscasualolivepleat.",
  },
  {
    id: "cscasualburgundysweat",
    description: "Deep burgundy relaxed cotton fleece sweatpants with cinched cuffs (distilled from Sporty & Rich).",
    tags: ["casual", "lounge", "athletic", "us"],
    prompt:
      "Deep burgundy relaxed-fit heavyweight cotton fleece sweatpants with an elasticized drawstring waistband, cinched ankle cuffs, and discreet crest embroidery. Isolated wardrobe piece cscasualburgundysweat.",
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
  {
    id: "cscasualredretro",
    description: "Crimson-red suede retro low-profile sneakers with cream stripes (distilled from Sporty & Rich).",
    tags: ["casual", "street", "europe", "korea"],
    prompt:
      "Low-profile retro slim terrace sneakers in crimson-red suede with cream leather side stripes, cream laces, and thin dark gum soles. Isolated wardrobe piece cscasualredretro.",
  },
  {
    id: "cscasualsuedeclog",
    description: "Warm beige suede round-toe platform mule clogs with lugged outsole (distilled from Varley).",
    tags: ["casual", "lounge", "europe", "us"],
    prompt:
      "Neutral warm-beige suede round-toe slip-on mule clogs anchored by a chunky black lugged rubber outsole. Isolated wardrobe piece cscasualsuedeclog.",
  },
  {
    id: "cscasualtabiflat",
    description: "Minimalist black leather split-toe ballet flats (distilled from Uniqlo).",
    tags: ["casual", "street", "japan"],
    prompt:
      "Minimalist smooth black leather split-toe ballet flat shoes with a sleek low-profile sole and soft vamp. Isolated wardrobe piece cscasualtabiflat.",
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
  {
    id: "cscasualretroheadset",
    description: "Vintage slim metal headband wired on-ear foam headphones (distilled from Sporty & Rich).",
    tags: ["casual", "street", "us", "korea"],
    prompt:
      "Vintage 1980s lightweight wired on-ear headphones with a slim brushed-metal headband and black circular foam ear cushions worn over the ears or around the neck. Isolated wardrobe piece cscasualretroheadset.",
  },
  {
    id: "cscasualtartanscarf",
    description: "Brushed mohair tartan plaid winter scarf in emerald and navy (distilled from ARKET).",
    tags: ["casual", "winter", "europe"],
    prompt:
      "Wide brushed fuzzy mohair-wool long winter scarf in a rich emerald-green, navy, and burgundy tartan plaid with twisted fringe ends. Isolated wardrobe piece cscasualtartanscarf.",
  },
  {
    id: "cscasualpuffybag",
    description: "Off-white diamond-quilted puffy crescent shoulder bag (distilled from Uniqlo).",
    tags: ["casual", "street", "japan", "korea"],
    prompt:
      "Soft off-white diamond-quilted puffy nylon crescent shoulder bag slung effortlessly across the body or over one shoulder. Isolated wardrobe piece cscasualpuffybag.",
  },
];

export const CASUAL_LABELS_EN = {
  hair: {
    cscasualclawclip: "Claw-Clip Half-Up",
    cscasualtopknot: "Messy Casual Top Knot",
    cscasualsleektuck: "Sleek Ear-Tucked Center Part",
    cscasualmicrofringe: "Textured Crop Micro-Fringe",
  },
  top: {
    cscasualhenley: "Oatmeal Waffle Henley",
    cscasuallinenresort: "Linen Resort Shirt",
    cscasualseoulfleece: "Seoul Fleece Half-Zip",
    cscasualhkpolo: "HK Smart-Casual Polo",
    cscasualnordicknit: "Nordic Fisherman Knit",
    cscasualtokyostripe: "Tokyo Breton Stripe Tee",
    cscasualyogaotton: "Yoga-to-Street Cotton Tee",
    cscasualcrestsweat: "Collegiate Crest Layered Sweatshirt",
    cscasualsherpapuffer: "Sherpa-Collar Down Puffer",
    cscasualscarfcoat: "Draped Scarf Wool Coat",
    cscasualhoundstooth: "Houndstooth Wool Blouson",
    cscasualredcardigan: "Crimson Fine-Knit Cardigan",
  },
  pants: {
    cscasualjoggers: "Everyday Tapered Joggers",
    cscasuallinenwide: "Linen Wide-Leg Trousers",
    cscasualcargo: "Soft Khaki Cargo Pants",
    cscasualseamleggings: "Mocha Lounge Leggings",
    cscasualbarrelpants: "Off-White Barrel Utility Pants",
    cscasualcorduroywide: "Chocolate Wide-Leg Corduroys",
    cscasualolivepleat: "Olive Accordion Pleated Skirt",
    cscasualburgundysweat: "Burgundy Fleece Sweatpants",
  },
  shoes: {
    cscasualslipon: "Cream Canvas Slip-Ons",
    cscasualcloudrunner: "Cloud-Foam Casual Runners",
    cscasualbirksandal: "Cork Two-Strap Sandals",
    cscasualredretro: "Crimson Suede Retro Sneakers",
    cscasualsuedeclog: "Suede Lug-Sole Platform Clogs",
    cscasualtabiflat: "Black Split-Toe Tabi Flats",
  },
  accessory: {
    cscasualbeanie: "Ribbed Everyday Beanie",
    cscasualtotebag: "Canvas Weekend Tote",
    cscasualairpods: "Wireless Earbud Case",
    cscasualretroheadset: "Retro Metal On-Ear Headphones",
    cscasualtartanscarf: "Brushed Tartan Mohair Scarf",
    cscasualpuffybag: "Quilted Puffy Crescent Bag",
  },
} as const;

export const CASUAL_LABELS_ZH = {
  hair: {
    cscasualclawclip: "龜夾半紮隨性髮型",
    cscasualtopknot: "鬆散隨性高丸子頭",
    cscasualsleektuck: "中分耳後俐落順髮",
    cscasualmicrofringe: "隨性微碎眉上短瀏海",
  },
  top: {
    cscasualhenley: "燕麥色華夫格亨利衫",
    cscasuallinenresort: "地中海亞麻度假襯衫",
    cscasualseoulfleece: "首爾日常抓毛半拉鍊",
    cscasualhkpolo: "香港 Smart Casual Polo",
    cscasualnordicknit: "北歐漁夫麻花冷衫",
    cscasualtokyostripe: "東京週末布列塔尼條紋 Tee",
    cscasualyogaotton: "瑜珈通勤寬鬆棉 Tee",
    cscasualcrestsweat: "學院徽章衛衣襯衫疊穿",
    cscasualsherpapuffer: "羊羔毛翻領羽絨外套",
    cscasualscarfcoat: "圍巾領立體羊毛短大衣",
    cscasualhoundstooth: "千鳥格羊毛短夾克",
    cscasualredcardigan: "緋紅細針織圓領開襟衫",
  },
  pants: {
    cscasualjoggers: "日常修腳運動棉褲",
    cscasuallinenwide: "亞麻闊腳長褲",
    cscasualcargo: "水洗卡其休閒工裝褲",
    cscasualseamleggings: "摩卡色居家瑜珈legging",
    cscasualbarrelpants: "米白高腰繭型工裝闊褲",
    cscasualcorduroywide: "巧克力棕打褶燈芯絨闊褲",
    cscasualolivepleat: "橄欖綠風琴百褶中長裙",
    cscasualburgundysweat: "酒紅重磅束口休閒棉褲",
  },
  shoes: {
    cscasualslipon: "米白帆布懶人鞋",
    cscasualcloudrunner: "雲感厚底休閒跑鞋",
    cscasualbirksandal: "軟木雙帶涼鞋",
    cscasualredretro: "復古紅麂皮薄底德訓鞋",
    cscasualsuedeclog: "駝色麂皮厚齒底穆勒鞋",
    cscasualtabiflat: "極簡黑皮革分趾芭蕾平底鞋",
  },
  accessory: {
    cscasualbeanie: "羅紋日常冷帽",
    cscasualtotebag: "帆布週末托特包",
    cscasualairpods: "無線耳機充電盒",
    cscasualretroheadset: "復古金屬頭戴式泡棉耳機",
    cscasualtartanscarf: "蘇格蘭格紋馬海毛流蘇圍巾",
    cscasualpuffybag: "米白菱格絎縫雲朵單肩包",
  },
} as const;
