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
  {
    id: "cscasualsoftupdo",
    description: "Relaxed casual updo with loose face-framing wisps along the cheeks (distilled from _tnnn26).",
    tags: ["casual", "lounge", "korea", "summer"],
    prompt:
      "Dark brunette hair styled in a relaxed casual low updo with soft, loose face-framing wisps falling naturally along the cheeks and ears. Isolated wardrobe piece cscasualsoftupdo.",
  },
  {
    id: "cscasualribbonbraid",
    description: "Half-up romantic waves tied with a sheer dusty-blue organza ribbon bow (distilled from tammyy.tm).",
    tags: ["casual", "summer", "korea"],
    prompt:
      "Long dark brunette wavy hair styled half-up and tied at the crown with a sheer dusty-blue organza ribbon bow, soft curls cascading over the shoulders. Isolated wardrobe piece cscasualribbonbraid.",
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
  {
    id: "cscasualboleroshrug",
    description: "Cropped open-knit cream bolero shrug layered over a fitted tank (distilled from wtingv_ & _tnnn26).",
    tags: ["casual", "lounge", "korea", "summer"],
    prompt:
      "Cropped cream-white pointelle open-knit long-sleeve bolero shrug cardigan layered casually over a fitted scoop-neck ribbed tank top. Isolated wardrobe piece cscasualboleroshrug.",
  },
  {
    id: "cscasualsatinjersey",
    description: "Oversized icy-blue satin sporty jersey top with ribbed collar (distilled from _tnnn26).",
    tags: ["casual", "street", "athletic", "korea"],
    prompt:
      "Oversized metallic icy-blue satin sporty V-neck jersey top featuring a grey ribbed polo collar accent and subtle tonal athletic numerals. Isolated wardrobe piece cscasualsatinjersey.",
  },
  {
    id: "cscasualchiffonhalter",
    description: "Fluid light-beige pleated chiffon halter-neck sleeveless top (distilled from pparadeee).",
    tags: ["casual", "summer", "formal", "sea"],
    prompt:
      "Fluid light-beige sheer chiffon halter-neck sleeveless top featuring delicate vertical micro-pleats and an airy gathered tie neckline. Isolated wardrobe piece cscasualchiffonhalter.",
  },
  {
    id: "cscasualcobaltknit",
    description: "Form-fitting royal cobalt-blue fine-ribbed knit long-sleeve top (distilled from maggielee2xys).",
    tags: ["casual", "street", "korea"],
    prompt:
      "Form-fitting royal cobalt-blue fine-ribbed knit long-sleeve top featuring a wide scoop neckline and sleek elongated cuffs. Isolated wardrobe piece cscasualcobaltknit.",
  },
  {
    id: "cscasualraglanheart",
    description: "Baby-pink and white raglan long-sleeve tee with a mini chest heart (distilled from tammyy.tm).",
    tags: ["casual", "lounge", "korea", "street"],
    prompt:
      "Fitted long-sleeve raglan crewneck tee with pastel baby-pink contrast sleeves, a crisp white torso, and a tiny embroidered red heart on the chest. Isolated wardrobe piece cscasualraglanheart.",
  },
  {
    id: "cscasualoliveshacket",
    description: "Oversized olive-drab cotton-canvas utility safari shacket (distilled from j876my).",
    tags: ["casual", "street", "winter"],
    prompt:
      "Oversized olive-drab washed cotton-canvas utility safari shacket featuring four buttoned flap pockets, a pointed collar, and relaxed dropped shoulders. Isolated wardrobe piece cscasualoliveshacket.",
  },
  {
    id: "cscasualfloralcamiset",
    description: "Pale-blue watercolor floral ruffled camisole layered under a soft knit cardigan (distilled from wtingv_).",
    tags: ["casual", "summer", "korea"],
    prompt:
      "Pale-blue watercolor ditsy-floral camisole top with a ruffled square neckline layered beneath a soft slouchy cream knit cardigan. Isolated wardrobe piece cscasualfloralcamiset.",
  },
  {
    id: "cscasualcharcoalvneck",
    description: "Charcoal-grey form-fitting athletic V-neck short-sleeve crop top (distilled from formunawei).",
    tags: ["casual", "athletic", "tennis", "pickleball", "summer"],
    prompt:
      "Charcoal-grey form-fitting short-sleeve athletic V-neck crop top in smooth four-way stretch jersey with contoured waist seaming. Isolated wardrobe piece cscasualcharcoalvneck.",
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
  {
    id: "cscasualginghamshorts",
    description: "Light-blue and white micro-gingham cotton lounge shorts with ruffled hem (distilled from yeyedamei).",
    tags: ["casual", "lounge", "summer", "korea"],
    prompt:
      "Light-blue and white micro-gingham woven cotton lounge shorts featuring an elasticated drawstring waist and a soft ruffled hemline. Isolated wardrobe piece cscasualginghamshorts.",
  },
  {
    id: "cscasualstrappedcargo",
    description: "Loose light-grey technical parachute cargo pants with buckle straps (distilled from formunawei).",
    tags: ["casual", "street", "korea"],
    prompt:
      "Loose-fitting light heather-grey technical nylon parachute cargo pants featuring bellows thigh pockets and cinched webbing buckle straps around the lower legs. Isolated wardrobe piece cscasualstrappedcargo.",
  },
  {
    id: "cscasualchampagneskirt",
    description: "Shimmering champagne-gold satin draped mini wrap skirt (distilled from tammyy.tm).",
    tags: ["casual", "formal", "summer", "sea"],
    prompt:
      "Lustrous champagne-gold silk-satin mini wrap skirt featuring asymmetrical side ruching and a fluid bias-cut hemline. Isolated wardrobe piece cscasualchampagneskirt.",
  },
  {
    id: "cscasualflarelounge",
    description: "Black low-rise soft jersey flare lounge trousers with drawstring waist (distilled from pparadeee).",
    tags: ["casual", "lounge", "yoga", "street"],
    prompt:
      "Sleek black low-rise soft modal-jersey flare lounge trousers featuring a wide fold-over waist with an adjustable cream drawstring tie. Isolated wardrobe piece cscasualflarelounge.",
  },
  {
    id: "cscasualtierlaceskirt",
    description: "Delicate white cotton tiered mini skirt with floral lace embroidery (distilled from _tnnn26).",
    tags: ["casual", "summer", "korea", "japan"],
    prompt:
      "Delicate crisp white cotton tiered mini skirt featuring gathered ruffled layers and subtle floral broderie anglaise lace trim. Isolated wardrobe piece cscasualtierlaceskirt.",
  },
  {
    id: "cscasualfloralshorts",
    description: "High-waisted multicolored floral jacquard knit mini shorts (distilled from j876my).",
    tags: ["casual", "street", "summer"],
    prompt:
      "High-waisted tailored knit mini shorts featuring an intricate multicolored vintage floral tapestry jacquard pattern and ribbed trim. Isolated wardrobe piece cscasualfloralshorts.",
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
  {
    id: "cscasualleopardflats",
    description: "Leopard-print calf-hair slip-on flat mules paired with ribbed white crew socks (distilled from j876my).",
    tags: ["casual", "street", "korea"],
    prompt:
      "Rounded-toe slip-on flat ballet mules in spotted leopard-print calf hair styled with thick ribbed white cotton crew socks pulled to mid-calf. Isolated wardrobe piece cscasualleopardflats.",
  },
  {
    id: "cscasualvelcrosneak",
    description: "Slim low-profile white leather sneaker flats with triple velcro straps (distilled from formunawei).",
    tags: ["casual", "street", "athletic", "korea"],
    prompt:
      "Slim low-profile crisp white leather sneaker flats fastened with triple hook-and-loop velcro straps over a thin gum-rubber outsole. Isolated wardrobe piece cscasualvelcrosneak.",
  },
  {
    id: "cscasualcrystalpumps",
    description: "Glossy black pointed-toe slingback kitten heels with a crystal buckle (distilled from yeyedamei).",
    tags: ["casual", "formal", "korea"],
    prompt:
      "Glossy black patent-leather pointed-toe slingback kitten heels adorned with a sparkling rectangular crystal-embellished buckle on the vamp. Isolated wardrobe piece cscasualcrystalpumps.",
  },
  {
    id: "cscasualshearlingboot",
    description: "Cream suede mini shearling snow boots with plush fleece trim and scrunched socks (distilled from j876my).",
    tags: ["casual", "lounge", "winter"],
    prompt:
      "Light cream suede ankle-height mini shearling platform boots lined with plush fluffy wool fleece, worn with scrunched white ribbed knit leg-warmer socks. Isolated wardrobe piece cscasualshearlingboot.",
  },
  {
    id: "cscasualyellowretro",
    description: "Vibrant mustard-yellow retro low-profile suede sneakers with black stripes (distilled from formunawei).",
    tags: ["casual", "street", "athletic"],
    prompt:
      "Vibrant mustard-yellow low-profile retro suede terrace sneakers featuring contrast black leather side stripes and slim dark gum soles. Isolated wardrobe piece cscasualyellowretro.",
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
  {
    id: "cscasualbutterflychain",
    description: "Intricate silver butterfly and star charm layered collarbone necklace (distilled from wtingv_).",
    tags: ["casual", "street", "korea"],
    prompt:
      "Multi-layered polished sterling-silver collarbone chain necklace adorned with delicate dangling butterfly and star charms. Isolated wardrobe piece cscasualbutterflychain.",
  },
  {
    id: "cscasualcharmminibag",
    description: "Structured cream leather mini handbag adorned with a cute plush bag charm (distilled from yeyedamei).",
    tags: ["casual", "street", "korea", "japan"],
    prompt:
      "Structured cream-white leather mini top-handle handbag decorated with a cute fluffy pastel plush keychain charm clipped to the handle. Isolated wardrobe piece cscasualcharmminibag.",
  },
  {
    id: "cscasualtullescarf",
    description: "Gossamer sheer off-white tulle skinny neck scarf with fringe trim (distilled from formunawei).",
    tags: ["casual", "street", "korea"],
    prompt:
      "Gossamer sheer off-white tulle skinny neck scarf with delicate wispy fringe trim draped loosely once around the neck with long trailing ends. Isolated wardrobe piece cscasualtullescarf.",
  },
  {
    id: "cscasualstuddedbag",
    description: "Vivid cyan-blue studded leather barrel shoulder bag (distilled from j876my).",
    tags: ["casual", "street", "korea"],
    prompt:
      "Vivid cyan-blue leather east-west barrel shoulder bag embellished with polished silver round metal studs and dual long shoulder straps. Isolated wardrobe piece cscasualstuddedbag.",
  },
  {
    id: "cscasualbakerboycap",
    description: "Structured black wool-blend baker boy newsboy cap (distilled from j876my).",
    tags: ["casual", "street", "europe"],
    prompt:
      "Structured matte-black wool-blend eight-panel baker boy newsboy cap with a short curved visor and side button detail. Isolated wardrobe piece cscasualbakerboycap.",
  },
  {
    id: "cscasualorganzabow",
    description: "Sheer dusty-blue organza hair ribbon bow paired with a pearl charm necklace (distilled from tammyy.tm).",
    tags: ["casual", "summer", "korea"],
    prompt:
      "Sheer dusty-blue organza ribbon tied into a wide romantic bow in the hair, paired with a dainty white seed-pearl charm necklace at the collarbone. Isolated wardrobe piece cscasualorganzabow.",
  },
];

export const CASUAL_LABELS_EN = {
  hair: {
    cscasualclawclip: "Claw-Clip Half-Up",
    cscasualtopknot: "Messy Casual Top Knot",
    cscasualsleektuck: "Sleek Ear-Tucked Center Part",
    cscasualmicrofringe: "Textured Crop Micro-Fringe",
    cscasualsoftupdo: "Soft Wispy Low Updo",
    cscasualribbonbraid: "Organza Ribbon Half-Up Waves",
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
    cscasualboleroshrug: "Cream Pointelle Bolero Shrug Set",
    cscasualsatinjersey: "Icy-Blue Satin Sporty Jersey",
    cscasualchiffonhalter: "Pleated Chiffon Halter Top",
    cscasualcobaltknit: "Cobalt-Blue Ribbed Scoop Knit",
    cscasualraglanheart: "Baby-Pink Heart Raglan Long-Sleeve",
    cscasualoliveshacket: "Olive Canvas Utility Shacket",
    cscasualfloralcamiset: "Watercolor Floral Cami & Cardigan",
    cscasualcharcoalvneck: "Charcoal Athletic V-Neck Crop",
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
    cscasualginghamshorts: "Blue Gingham Ruffle Lounge Shorts",
    cscasualstrappedcargo: "Buckle-Strap Parachute Cargos",
    cscasualchampagneskirt: "Champagne Satin Mini Wrap Skirt",
    cscasualflarelounge: "Drawstring Low-Rise Flare Pants",
    cscasualtierlaceskirt: "White Tiered Broderie Mini Skirt",
    cscasualfloralshorts: "Vintage Floral Jacquard Shorts",
  },
  shoes: {
    cscasualslipon: "Cream Canvas Slip-Ons",
    cscasualcloudrunner: "Cloud-Foam Casual Runners",
    cscasualbirksandal: "Cork Two-Strap Sandals",
    cscasualredretro: "Crimson Suede Retro Sneakers",
    cscasualsuedeclog: "Suede Lug-Sole Platform Clogs",
    cscasualtabiflat: "Black Split-Toe Tabi Flats",
    cscasualleopardflats: "Leopard Calf-Hair Flats & Crew Socks",
    cscasualvelcrosneak: "Triple-Velcro White Sneaker Flats",
    cscasualcrystalpumps: "Crystal-Buckle Slingback Kitten Heels",
    cscasualshearlingboot: "Cream Shearling Mini Boots & Socks",
    cscasualyellowretro: "Mustard-Yellow Retro Terrace Sneakers",
  },
  accessory: {
    cscasualbeanie: "Ribbed Everyday Beanie",
    cscasualtotebag: "Canvas Weekend Tote",
    cscasualairpods: "Wireless Earbud Case",
    cscasualretroheadset: "Retro Metal On-Ear Headphones",
    cscasualtartanscarf: "Brushed Tartan Mohair Scarf",
    cscasualpuffybag: "Quilted Puffy Crescent Bag",
    cscasualbutterflychain: "Silver Butterfly Layered Necklace",
    cscasualcharmminibag: "Cream Mini Bag with Plush Charm",
    cscasualtullescarf: "Sheer Tulle Fringe Skinny Scarf",
    cscasualstuddedbag: "Cyan Studded Barrel Shoulder Bag",
    cscasualbakerboycap: "Black Wool Baker Boy Cap",
    cscasualorganzabow: "Dusty-Blue Organza Bow & Pearl Chain",
  },
} as const;

export const CASUAL_LABELS_ZH = {
  hair: {
    cscasualclawclip: "龜夾半紮隨性髮型",
    cscasualtopknot: "鬆散隨性高丸子頭",
    cscasualsleektuck: "中分耳後俐落順髮",
    cscasualmicrofringe: "隨性微碎眉上短瀏海",
    cscasualsoftupdo: "慵懶碎髮低盤髮",
    cscasualribbonbraid: "霧藍歐根紗蝴蝶結半紮捲髮",
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
    cscasualboleroshrug: "米白鏤空短版罩衫背心套裝",
    cscasualsatinjersey: "冰藍緞面運動風翻領球衣",
    cscasualchiffonhalter: "淺米細褶雪紡削肩綁帶上衣",
    cscasualcobaltknit: "寶藍修身細羅紋大圓領針織衫",
    cscasualraglanheart: "粉白拼色愛心刺繡插肩長袖 Tee",
    cscasualoliveshacket: "橄欖綠水洗帆布多袋工裝襯衫外套",
    cscasualfloralcamiset: "水彩藍碎花吊帶配軟糯針織開襟衫",
    cscasualcharcoalvneck: "炭灰修身運動 V 領短版上衣",
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
    cscasualginghamshorts: "淺藍格紋荷葉邊居家短褲",
    cscasualstrappedcargo: "淺灰綁帶扣環降落傘工裝長褲",
    cscasualchampagneskirt: "香檳金緞面抓皺裹身短裙",
    cscasualflarelounge: "黑色低腰抽繩軟糯微喇休閒褲",
    cscasualtierlaceskirt: "純白蕾絲鏤空蛋糕百褶短裙",
    cscasualfloralshorts: "復古繁花提花針織高腰短褲",
  },
  shoes: {
    cscasualslipon: "米白帆布懶人鞋",
    cscasualcloudrunner: "雲感厚底休閒跑鞋",
    cscasualbirksandal: "軟木雙帶涼鞋",
    cscasualredretro: "復古紅麂皮薄底德訓鞋",
    cscasualsuedeclog: "駝色麂皮厚齒底穆勒鞋",
    cscasualtabiflat: "極簡黑皮革分趾芭蕾平底鞋",
    cscasualleopardflats: "豹紋馬毛平底瑪莉珍配白長襪",
    cscasualvelcrosneak: "純白三魔鬼氈薄底運動平底鞋",
    cscasualcrystalpumps: "亮黑方鑽釦尖頭後空低跟鞋",
    cscasualshearlingboot: "奶油麂皮羊羔毛短雪靴配堆堆襪",
    cscasualyellowretro: "芥末黃黑條紋復古薄底德訓鞋",
  },
  accessory: {
    cscasualbeanie: "羅紋日常冷帽",
    cscasualtotebag: "帆布週末托特包",
    cscasualairpods: "無線耳機充電盒",
    cscasualretroheadset: "復古金屬頭戴式泡棉耳機",
    cscasualtartanscarf: "蘇格蘭格紋馬海毛流蘇圍巾",
    cscasualpuffybag: "米白菱格絎縫雲朵單肩包",
    cscasualbutterflychain: "純銀蝴蝶星星疊戴鎖骨項鍊",
    cscasualcharmminibag: "奶油白毛絨掛飾迷你手提包",
    cscasualtullescarf: "透膚白薄紗流蘇細長頸巾",
    cscasualstuddedbag: "亮青藍鉚釘圓筒單肩腋下包",
    cscasualbakerboycap: "黑色羊毛八角報童帽",
    cscasualorganzabow: "霧藍歐根紗髮帶配珍珠細項鍊",
  },
} as const;
