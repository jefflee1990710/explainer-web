// Original silhouette catalog. Each cut is a street / retail shape distilled into a new
// description (barrel jeans, bubble minis, column skirts, Italian bobs, and so on).
// Source photos are never shipped. Prompts name no brand, logo, celebrity, or child.
import type { CharacterLookOption } from "@/service/character/character-look";

type Axis = { readonly en: string; readonly zh: string; readonly bit: string };

function ax(en: string, zh: string, bit: string): Axis {
  return { en, zh, bit };
}

type Built = {
  options: CharacterLookOption[];
  labelsEn: Record<string, string>;
  labelsZh: Record<string, string>;
};

// Dye words fight the hair-color picker, so hair prompts stay colorless.
const HAIR_DYE =
  /\b(black|white|ivory|cream|ecru|pearl|navy|charcoal|slate|graphite|beige|sand|camel|taupe|oat|olive|khaki|moss|burgundy|maroon|wine|oxblood|red|scarlet|crimson|cherry|blue|indigo|cobalt|teal|turquoise|aqua|green|emerald|sage|forest|brown|espresso|chocolate|cognac|chestnut|grey|gray|silver|heather|pink|blush|rose|mauve|yellow|gold|champagne|mustard|orange|coral|terracotta|rust|purple|violet|lavender|lilac|blonde|brunette|auburn|ginger|tortoiseshell|honey|caramel|platinum|ash)\b/i;

// Short existing prompts. A new sentence must not contain one of these whole strings.
const FORBIDDEN_PROMPTS = [
  "straight blue jeans",
  "knee-length shorts",
  "white sneakers",
  "dark ankle boots",
  "brown leather penny loafers",
  "open sandals",
  "chin-length straight bob with a centre part",
  "long straight hair past the shoulders",
  "short tight curls",
  "hair pulled into a round top bun",
  "very short cropped hair",
  "a fitted heavyweight crew-neck t-shirt",
  "a structured oversized streetwear hoodie",
  "a sharp tailored double-breasted wool blazer",
  "tailored beige chinos",
  "draped high-waisted wide-leg trousers",
  "sleek matte black athletic leggings",
  "clean bald head, no hair",
];

function build(kind: string, groups: readonly (readonly Axis[])[], hair: boolean): Built {
  const rows: { en: string; zh: string; bit: string }[] = [];
  const walk = (index: number, en: string[], zh: string[], bits: string[]) => {
    if (index === groups.length) {
      rows.push({ en: en.join(" "), zh: zh.join(""), bit: bits.join("; ") });
      return;
    }
    for (const axis of groups[index]!) {
      walk(index + 1, [...en, axis.en], [...zh, axis.zh], [...bits, axis.bit]);
    }
  };
  walk(0, [], [], []);
  if (rows.length !== 50) {
    throw new Error(`Silhouette ${kind} produced ${rows.length} cuts, expected 50`);
  }
  const options: CharacterLookOption[] = [];
  const labelsEn: Record<string, string> = {};
  const labelsZh: Record<string, string> = {};
  rows.forEach((row, index) => {
    const id = `sg${kind}${String(index + 1).padStart(2, "0")}`;
    const prompt = `Original catalogue cut: ${row.bit}. No logos, no letters, and no children. Isolated wardrobe piece ${id}.`;
    if (hair && HAIR_DYE.test(prompt)) {
      throw new Error(`Hair ${id} names a dye color: ${prompt}`);
    }
    const banned = FORBIDDEN_PROMPTS.find((phrase) => prompt.includes(phrase));
    if (banned) throw new Error(`${id} contains existing prompt "${banned}"`);
    options.push({
      id,
      silhouette: kind,
      description: row.en,
      tags: [kind],
      prompt,
    });
    labelsEn[id] = row.en;
    labelsZh[id] = row.zh;
  });
  return { options, labelsEn, labelsZh };
}

function merge(parts: Built[]): { options: CharacterLookOption[]; en: Record<string, string>; zh: Record<string, string> } {
  return {
    options: parts.flatMap((part) => part.options),
    en: Object.assign({}, ...parts.map((part) => part.labelsEn)),
    zh: Object.assign({}, ...parts.map((part) => part.labelsZh)),
  };
}

const jeans = build("jeans", [
  [
    ax("High-rise", "高腰", "a waistband sitting above the natural waist"),
    ax("Mid-rise", "中腰", "a waistband sitting on the natural waist"),
    ax("Low-rise", "低腰", "a waistband resting on the hip bone"),
    ax("Super-high", "超高腰", "a waistband reaching the lower rib"),
    ax("Hip-slung", "胯骨", "a long rise with the waistband slung on the hip"),
  ],
  [
    ax("column jeans", "直筒牛仔褲", "five-pocket indigo denim with a column leg that keeps one width from thigh to a clean ankle hem"),
    ax("barrel jeans", "桶型牛仔褲", "five-pocket ecru denim with a barrel thigh that rounds outward and narrows before the ankle"),
    ax("stacked jeans", "堆疊牛仔褲", "five-pocket faded indigo denim with a roomy leg that stacks in soft folds over the footwear"),
    ax("kick-flare jeans", "微喇牛仔褲", "five-pocket black-rinse denim, narrow through the knee and opening slightly at the hem"),
    ax("pool jeans", "大喇叭牛仔褲", "five-pocket rigid indigo denim that widens sharply below the knee into a floor-skimming flare"),
    ax("cigarette jeans", "煙管牛仔褲", "five-pocket clean black denim with a narrow leg ending just above the ankle bone"),
    ax("stovepipe jeans", "硬挺直筒牛仔褲", "five-pocket raw unwashed denim with a rigid stovepipe leg and almost no taper"),
    ax("horseshoe jeans", "馬蹄牛仔褲", "five-pocket vintage-fade denim, generous through the thigh and gently narrower at the hem"),
    ax("split-hem jeans", "開衩牛仔褲", "five-pocket mid-indigo denim with a column leg and a short slit at the outer ankle"),
    ax("yoke jeans", "弧線牛仔褲", "five-pocket stretch indigo denim with a curved seat yoke and a column fall"),
  ],
], false);

const mini = build("mini", [
  [
    ax("Poplin", "府綢", "cut in crisp cotton poplin"),
    ax("Linen", "亞麻", "cut in breathable linen"),
    ax("Satin", "緞面", "cut in fluid satin"),
    ax("Denim", "丹寧", "cut in rigid denim"),
    ax("Ponte", "針織", "cut in smooth ponte knit"),
  ],
  [
    ax("bubble mini", "泡泡短裙", "a bubble skirt that balloons and cinches on the upper thigh"),
    ax("knife-pleat mini", "刀褶短裙", "a knife-pleated skirt ending on the upper thigh"),
    ax("wrap mini", "交疊短裙", "a wrap skirt with a deep overlap ending on the upper thigh"),
    ax("asymmetric mini", "不規則短裙", "an asymmetric skirt with a longer side point still on the upper thigh"),
    ax("bias mini", "斜裁短裙", "a bias-cut slip skirt clinging then flaring on the upper thigh"),
    ax("tiered mini", "層次短裙", "a two-tier ruffle skirt ending on the upper thigh"),
    ax("godet mini", "魚尾短裙", "a straight skirt with godet inserts releasing at the upper thigh"),
    ax("flap mini", "口袋短裙", "a skirt with two flap patch pockets and a hem on the upper thigh"),
    ax("A-line mini", "A字短裙", "an A-line skirt swinging from the hip and ending on the upper thigh"),
    ax("box-pleat mini", "箱褶短裙", "a box-pleated skirt with a flat front panel ending on the upper thigh"),
  ],
], false);

const midi = build("midi", [
  [
    ax("Wool", "羊毛", "cut in matte wool suiting"),
    ax("Linen", "亞麻", "cut in washed linen"),
    ax("Satin", "緞面", "cut in bias satin"),
    ax("Denim", "丹寧", "cut in mid-wash denim"),
    ax("Crepe", "縐紗", "cut in fluid crepe"),
  ],
  [
    ax("pencil midi", "鉛筆中長裙", "a pencil skirt, narrow through the hip, with a hem at mid-calf and a short back vent"),
    ax("pleated midi", "百褶中長裙", "a fully pleated skirt falling from the waist to mid-calf"),
    ax("wrap midi", "交疊中長裙", "a wrap skirt overlapping at the front and stopping just below the knee"),
    ax("column midi", "直筒中長裙", "a column skirt with almost no flare and a hem at mid-calf"),
    ax("trumpet midi", "喇叭中長裙", "a skirt fitted to the knee then opening toward a mid-calf hem"),
    ax("flap midi", "口袋中長裙", "a skirt with large flap pockets and a hem just below the knee"),
    ax("A-line midi", "A字中長裙", "an A-line skirt with a hem just below the knee"),
    ax("slip midi", "吊帶中長裙", "a bias slip skirt with a fluid drape ending at mid-calf"),
    ax("tiered midi", "層次中長裙", "a three-tier skirt with the lowest tier ending at mid-calf"),
    ax("godet midi", "魚尾中長裙", "a fitted skirt with godets opening below the knee toward mid-calf"),
  ],
], false);

const maxi = build("maxi", [
  [
    ax("Jersey", "汗布", "cut in fluid jersey"),
    ax("Linen", "亞麻", "cut in crisp linen"),
    ax("Satin", "緞面", "cut in liquid satin"),
    ax("Cotton", "棉", "cut in washed cotton"),
    ax("Chiffon", "雪紡", "cut in layered chiffon"),
  ],
  [
    ax("column maxi", "直筒長裙", "a column skirt with a clean hem at the ankle"),
    ax("bias maxi", "斜裁長裙", "a bias skirt skimming the body and pooling slightly at the floor"),
    ax("tiered maxi", "層次長裙", "a tiered skirt with each flounce longer, ending at the ankle"),
    ax("pleated maxi", "百褶長裙", "a sunburst-pleated skirt falling unbroken to the ankle"),
    ax("wrap maxi", "交疊長裙", "a wrap skirt with a long overlap reaching the ankle"),
    ax("slit maxi", "開衩長裙", "a column skirt to the ankle with one thigh-high slit"),
    ax("bubble maxi", "泡泡長裙", "a full skirt gathered into a bubble hem at the ankle"),
    ax("trumpet maxi", "喇叭長裙", "a skirt fitted through the hip and flaring to a floor hem"),
    ax("paneled maxi", "拼接長裙", "a skirt of long vertical panels falling straight to the floor"),
    ax("drawstring maxi", "抽繩長裙", "a full skirt on a drawstring waist falling to the ankle"),
  ],
], false);

const shorts = build("shorts", [
  [
    ax("High-rise", "高腰", "with a high waistband"),
    ax("Mid-rise", "中腰", "with a mid waistband"),
    ax("Pleated", "打褶", "with a single forward pleat"),
    ax("Elastic", "鬆緊", "with a covered elastic waist"),
    ax("Tailored", "修身", "with a flat tailored waistband"),
  ],
  [
    ax("city shorts", "城市短褲", "city shorts in stone cotton ending on the upper thigh"),
    ax("pleat shorts", "褶短褲", "pleated shorts in tropical wool ending on the upper thigh"),
    ax("denim shorts", "丹寧短褲", "five-pocket denim shorts with a raw hem on the upper thigh"),
    ax("runner shorts", "跑步短褲", "athletic runner shorts with a curved hem on the upper thigh"),
    ax("bermuda shorts", "百慕達短褲", "bermuda shorts whose hem sits on the knee"),
    ax("boxer shorts", "平口短褲", "relaxed boxer-cut shorts in cotton ending on the upper thigh"),
    ax("wrap shorts", "交疊短褲", "wrap-front shorts with a tie closure ending on the upper thigh"),
    ax("pocket shorts", "口袋短褲", "shorts with flap thigh pockets ending on the upper thigh"),
    ax("skater shorts", "滑板短褲", "loose skater shorts in twill ending on the upper thigh"),
    ax("leather shorts", "皮短褲", "smooth leather shorts with a clean hem on the upper thigh"),
  ],
], false);

const cargo = build("cargo", [
  [
    ax("Cotton", "棉", "in washed cotton twill"),
    ax("Nylon", "尼龍", "in matte technical nylon"),
    ax("Canvas", "帆布", "in sturdy canvas"),
    ax("Wool", "羊毛", "in dry wool"),
    ax("Ripstop", "防撕裂", "in lightweight ripstop"),
  ],
  [
    ax("relaxed cargo", "寬鬆工裝褲", "relaxed cargo trousers with large flap pockets on both thighs"),
    ax("tapered cargo", "束腳工裝褲", "tapered cargo trousers gathered into cuffs at the ankle"),
    ax("wide cargo", "闊腿工裝褲", "wide cargo trousers with boxy flap pockets and a full hem"),
    ax("cropped cargo", "七分工裝褲", "cropped cargo trousers ending above the ankle with flap pockets"),
    ax("double-knee cargo", "雙膝工裝褲", "cargo trousers with a double-knee panel and thigh flap pockets"),
    ax("low cargo", "低腰工裝褲", "low-slung cargo trousers with oversized bellows pockets"),
    ax("high cargo", "高腰工裝褲", "high-waisted cargo trousers with two small chest-like thigh pockets"),
    ax("painter cargo", "油漆工工裝褲", "painter cargo trousers with a hammer loop and a rule pocket"),
    ax("zip cargo", "拉鍊工裝褲", "cargo trousers whose thigh pockets close with a vertical zip"),
    ax("drawstring cargo", "抽繩工裝褲", "cargo trousers with a drawstring waist and flap pockets"),
  ],
], false);

const legging = build("legging", [
  [
    ax("High-rise", "高腰", "with a high compressive waist"),
    ax("Mid-rise", "中腰", "with a mid compressive waist"),
    ax("Foldover", "反摺腰", "with a foldover waistband"),
    ax("Cross", "交叉腰", "with a crossover V waist"),
    ax("Pocket", "側袋", "with a hidden side pocket at the hip"),
  ],
  [
    ax("full leggings", "全長緊身褲", "full-length matte leggings ending at the ankle"),
    ax("7/8 leggings", "七分緊身褲", "seven-eighths leggings ending above the ankle bone"),
    ax("capri leggings", "五分緊身褲", "capri leggings ending mid-calf"),
    ax("flared leggings", "喇叭緊身褲", "leggings that fit the thigh and flare from the knee"),
    ax("stirrup leggings", "腳蹬緊身褲", "stirrup leggings with a strap under the arch"),
    ax("rib leggings", "羅紋緊身褲", "vertically ribbed leggings with a close ankle"),
    ax("moto leggings", "機車緊身褲", "leggings with articulated knee panels"),
    ax("bootcut leggings", "靴型緊身褲", "leggings with a slight bootcut opening over the foot"),
    ax("seamless leggings", "無縫緊身褲", "seamless leggings with no outer seam line"),
    ax("yoga leggings", "瑜珈緊身褲", "yoga leggings with a gusset and a squat-proof matte face"),
  ],
], false);

const trouser = build("trouser", [
  [
    ax("Wool", "羊毛", "in charcoal wool"),
    ax("Cotton", "棉", "in stone cotton"),
    ax("Linen", "亞麻", "in oatmeal linen"),
    ax("Crepe", "縐紗", "in black crepe"),
    ax("Flannel", "法蘭絨", "in grey flannel"),
  ],
  [
    ax("pleated trousers", "打褶西褲", "single-pleat trousers with a straight leg and a pressed crease"),
    ax("flat trousers", "平腳西褲", "flat-front trousers with a straight leg and a clean hem"),
    ax("cropped trousers", "九分西褲", "trousers ending above the ankle bone with a narrow leg"),
    ax("cuffed trousers", "反摺西褲", "trousers with a deep turn-up at the hem"),
    ax("chino trousers", "斜紋休閒褲", "chino-cloth trousers with a straight leg and a coin pocket"),
    ax("drawstring trousers", "抽繩長褲", "relaxed trousers with a drawstring waist and a straight leg"),
    ax("cigarette trousers", "煙管西褲", "narrow trousers that stay straight to the ankle"),
    ax("double-pleat trousers", "雙褶西褲", "double-pleat trousers with room through the thigh and a tapered ankle"),
    ax("crease trousers", "中線西褲", "high-rise trousers with one sharp center crease"),
    ax("pintuck trousers", "明褶西褲", "trousers with two pintucks running down each leg"),
  ],
], false);

const wide = build("wide", [
  [
    ax("Wool", "羊毛", "in fluid wool"),
    ax("Denim", "丹寧", "in rigid denim"),
    ax("Satin", "緞面", "in ivory satin"),
    ax("Linen", "亞麻", "in washed linen"),
    ax("Jersey", "汗布", "in heavy jersey"),
  ],
  [
    ax("column wide", "直筒闊腿褲", "broad-leg trousers that fall in one wide column to the floor"),
    ax("palazzo wide", "宮殿闊腿褲", "very full trousers that swing from the hip to the floor"),
    ax("sailor wide", "水手闊腿褲", "broad-leg trousers with a buttoned front flap"),
    ax("pleated wide", "打褶闊腿褲", "wide trousers released from two deep pleats"),
    ax("cropped wide", "九分闊腿褲", "wide trousers ending above the ankle bone"),
    ax("bias wide", "斜裁闊腿褲", "bias-cut trousers with a soft wide drape"),
    ax("elastic wide", "鬆緊闊腿褲", "wide trousers on a covered elastic waist"),
    ax("split wide", "開衩闊腿褲", "wide trousers with a short slit at each outer hem"),
    ax("belted wide", "腰帶闊腿褲", "wide trousers with belt loops and a full hem"),
    ax("panel wide", "拼接闊腿褲", "wide trousers with a vertical panel seam down each leg"),
  ],
], false);

const skort = build("skort", [
  [
    ax("Poplin", "府綢", "in cotton poplin"),
    ax("Pique", "珠地", "in sport pique"),
    ax("Denim", "丹寧", "in rigid denim"),
    ax("Ponte", "針織", "in ponte knit"),
    ax("Linen", "亞麻", "in linen"),
  ],
  [
    ax("pleat skort", "刀褶褲裙", "a pleated skort with built-in shorts and a hem on the upper thigh"),
    ax("wrap skort", "交疊褲裙", "a wrap skort with an overlap panel and built-in shorts"),
    ax("bubble skort", "泡泡褲裙", "a bubble-hem skort with shorts hidden underneath"),
    ax("asymmetric skort", "不規則褲裙", "an asymmetric skort panel over fitted shorts"),
    ax("runner skort", "跑步褲裙", "a runner skort with a split overlay and inner shorts"),
    ax("court skort", "球場褲裙", "a court skort with knife pleats over compressive shorts"),
    ax("ruffle skort", "荷葉褲裙", "a ruffled overlay skort with a short inner brief"),
    ax("tailored skort", "修身褲裙", "a tailored skort that looks like a mini skirt from the front"),
    ax("flap skort", "口袋褲裙", "a skort with two flap pockets and a flat front panel"),
    ax("tiered skort", "層次褲裙", "a two-tier skort with shorts under the lower flounce"),
  ],
], false);

const bob = build("bob", [
  [
    ax("Glassy", "光面", "with a glassy smooth surface and a clean centre parting"),
    ax("Piecey", "碎塊", "with piecey separated strands and a soft side parting"),
    ax("Air-dried", "自然乾", "with an air-dried finish and no parting line"),
    ax("Bent-end", "尾彎", "with a slight bend only at the ends"),
    ax("Blunt", "齊線", "with a sealed blunt perimeter and a deep side parting"),
  ],
  [
    ax("chin bob", "齊下巴波波頭", "a one-length bob ending at the chin, ears covered"),
    ax("jaw bob", "下顎波波頭", "an angled bob, shorter at the back and longer toward the jaw"),
    ax("french bob", "法式波波頭", "a french bob ending at the ear, with a rounded edge"),
    ax("inverted bob", "內疊波波頭", "an inverted bob stacked shorter at the nape"),
    ax("bowl bob", "碗形波波頭", "a rounded bowl bob with a level hem around the head"),
    ax("tucked bob", "耳後波波頭", "a bob tucked behind one ear so the jawline shows"),
    ax("micro bob", "迷你波波頭", "a micro bob ending above the jaw"),
    ax("collar bob", "鎖骨上波波頭", "a one-length bob ending at the collar, above the shoulder seam"),
    ax("jawline bob", "貼顎波波頭", "a bob that curves along the jaw without a fringe"),
    ax("nape bob", "後頸波波頭", "a bob cut close at the nape and fuller at the sides"),
  ],
], true);

const longHair = build("long", [
  [
    ax("Centre-part", "中分", "with a centre parting"),
    ax("Side-part", "側分", "with a deep side parting"),
    ax("Grown-out", "自然分", "with a grown-out parting and no hard line"),
    ax("Off-centre", "偏分", "with an off-centre parting"),
    ax("Layered", "層次", "with hidden internal layers"),
  ],
  [
    ax("blunt long", "齊長直髮", "one-length hair extending below the shoulder seam with a blunt end"),
    ax("U-shape long", "U形長髮", "hair extending down the back in a U-shaped hem"),
    ax("V-shape long", "V形長髮", "hair extending down the back in a V-shaped hem"),
    ax("face-frame long", "修臉長髮", "lengths below the shoulder seam with strands curving along the jaw"),
    ax("razor long", "碎剪長髮", "lengths below the shoulder seam finished with a razor edge"),
    ax("sheet long", "一片長髮", "a heavy one-length sheet of hair down the back"),
    ax("bend long", "微彎長髮", "lengths below the shoulder seam with a soft bend at the ends"),
    ax("piecey long", "碎束長髮", "lengths below the shoulder seam separated into piecey sections"),
    ax("tucked long", "塞耳長髮", "lengths below the shoulder seam tucked behind one ear"),
    ax("centre-back long", "中後長髮", "lengths gathered visually down the spine past the shoulder blades"),
  ],
], true);

const waves = build("waves", [
  [
    ax("Loose", "大浪", "in loose S-bends"),
    ax("Tight", "細浪", "in compact S-bends"),
    ax("Root", "根蓬", "with lift only at the root"),
    ax("End", "尾浪", "with bends only from the ear downward"),
    ax("Wet", "濕感", "with a wet-look bend pressed close to the head"),
  ],
  [
    ax("beach waves", "海灘波浪髮", "beach-bend waves that start below the cheek"),
    ax("finger waves", "手推波浪髮", "sculpted finger-bend waves lying against the scalp"),
    ax("glam waves", "大波浪髮", "deep glam waves falling from a side parting"),
    ax("middle waves", "中分波浪髮", "even waves on both sides of a centre parting"),
    ax("ribbon waves", "帶狀波浪髮", "wide ribbon-like waves with space between each bend"),
    ax("piecey waves", "碎波浪髮", "broken piecey waves with uneven rhythm"),
    ax("crown waves", "頭頂波浪髮", "waves that begin at the crown and relax toward the ends"),
    ax("shoulder waves", "肩線波浪髮", "waves that stay smooth on top and bend at shoulder level"),
    ax("nape waves", "後頸波浪髮", "short sculpted waves concentrated at the nape"),
    ax("full waves", "全頭波浪髮", "uniform waves from the hairline through the ends"),
  ],
], true);

const curls = build("curls", [
  [
    ax("Corkscrew", "螺旋", "in corkscrew spirals"),
    ax("Coil", "圈捲", "in defined round coils"),
    ax("Clumped", "成束", "in clumped curl families"),
    ax("Ribbon", "帶捲", "in wide ribbon curls"),
    ax("Tapered", "收尖", "in curls that taper toward the ends"),
  ],
  [
    ax("crown curls", "頭頂捲髮", "curls concentrated on the crown with a smoother side"),
    ax("all-over curls", "全頭捲髮", "curls distributed evenly over the whole head"),
    ax("elongated curls", "拉長捲髮", "curls stretched longer through the mid-lengths"),
    ax("compact curls", "緊密捲髮", "compact coils sitting close to the scalp"),
    ax("zigzag curls", "之字捲髮", "zigzag curls with a sharp change of direction"),
    ax("twist curls", "扭轉捲髮", "twist-out curls with a visible rope pattern"),
    ax("root curls", "根部捲髮", "curls that spring from the root with less definition at the end"),
    ax("end curls", "尾端捲髮", "smooth roots turning into curls only at the ends"),
    ax("halo curls", "光環捲髮", "a halo of curls standing away from the head"),
    ax("taper curls", "漸收捲髮", "a rounded curl shape that is fuller at the sides"),
  ],
], true);

const bangs = build("bangs", [
  [
    ax("Full", "全瀏", "as a full fringe"),
    ax("Wispy", "空氣", "as a wispy see-through fringe"),
    ax("Micro", "極短", "as a micro fringe"),
    ax("Choppy", "碎剪", "as a choppy uneven fringe"),
    ax("Rounded", "圓弧", "as a rounded fringe"),
  ],
  [
    ax("blunt bangs", "齊瀏海", "blunt bangs cut straight across the brow"),
    ax("curtain bangs", "八字瀏海", "curtain bangs parting in the centre and curving to the cheek"),
    ax("brow bangs", "眉上瀏海", "bangs that stop just above the eyebrows"),
    ax("side bangs", "側瀏海", "bangs swept to one side"),
    ax("bottleneck bangs", "收窄瀏海", "bottleneck bangs, shorter in the centre and longer at the sides"),
    ax("brow-skimming bangs", "貼眉瀏海", "bangs skimming the eyebrows"),
    ax("parted bangs", "中分瀏海", "bangs split by a centre part"),
    ax("piecey bangs", "碎瀏海", "piecey bangs with separated strands"),
    ax("curved bangs", "弧形瀏海", "bangs that curve outward at the ends"),
    ax("face-frame bangs", "包臉瀏海", "bangs that continue into strands along the cheeks"),
  ],
], true);

const braid = build("braid", [
  [
    ax("Fine", "細辮", "worked in fine sections"),
    ax("Thick", "粗辮", "worked in one thick section"),
    ax("Two", "雙股", "worked as two matching braids"),
    ax("Crown", "頭頂", "started at the crown"),
    ax("Nape", "後頸", "started at the nape"),
  ],
  [
    ax("fishtail braid", "魚骨辮", "a fishtail braid resting over one shoulder"),
    ax("dutch braid", "荷式辮", "a dutch braid raised off the scalp"),
    ax("french braid", "法式辮", "a french braid lying flat along the centre of the head"),
    ax("halo braid", "環形辮", "a halo braid circling the crown"),
    ax("rope braid", "繩索辮", "a two-strand rope braid"),
    ax("pull-through braid", "穿拉辮", "a pull-through braid with looped segments"),
    ax("crown braid", "皇冠辮", "a crown braid wrapped around the hairline"),
    ax("side braid", "側辮", "a three-strand braid falling along one side of the neck"),
    ax("low braid", "低辮", "a low braid gathered at the nape"),
    ax("grid braid", "網格辮", "narrow plaits set in a neat scalp grid"),
  ],
], true);

const updo = build("updo", [
  [
    ax("High", "高盤", "pinned high on the crown"),
    ax("Low", "低盤", "pinned low at the nape"),
    ax("Side", "側盤", "pinned to one side"),
    ax("Twisted", "扭轉", "built from visible twists"),
    ax("Sculpted", "塑形", "sculpted smooth against the head"),
  ],
  [
    ax("twist updo", "扭轉盤髮", "an updo of two twists meeting at the back"),
    ax("nape updo", "後頸盤髮", "a low updo with the nape fully visible"),
    ax("braided updo", "編髮盤髮", "an updo wrapped from a braid"),
    ax("rolled updo", "捲筒盤髮", "an updo of horizontal rolls"),
    ax("tucked updo", "塞入盤髮", "an updo with the ends tucked in and hidden"),
    ax("looped updo", "環圈盤髮", "an updo of looped sections"),
    ax("cone updo", "錐形盤髮", "a tall smooth cone updo"),
    ax("knot updo", "結形盤髮", "an updo closed with one visible knot"),
    ax("half updo", "半盤髮", "a half updo with the lower lengths left down"),
    ax("wrapped updo", "纏繞盤髮", "an updo wrapped around its own base"),
  ],
], true);

const pony = build("pony", [
  [
    ax("High", "高馬尾", "tied high on the crown"),
    ax("Mid", "中馬尾", "tied at the occipital bone"),
    ax("Low", "低馬尾", "tied at the nape"),
    ax("Side", "側馬尾", "tied on one side"),
    ax("Bubble", "泡泡馬尾", "segmented with covered elastics"),
  ],
  [
    ax("sleek pony", "貼頭馬尾", "a sleek ponytail with a smooth wrap at the base"),
    ax("piecey pony", "碎束馬尾", "a piecey ponytail with a soft hairline"),
    ax("braided pony", "編髮馬尾", "a ponytail that continues into a braid"),
    ax("wavy pony", "波浪馬尾", "a ponytail with bends through the tail"),
    ax("curled pony", "捲尾馬尾", "a ponytail whose tail ends in curls"),
    ax("wrapped pony", "包根馬尾", "a ponytail with a hair wrap hiding the tie"),
    ax("centre pony", "中分馬尾", "a ponytail released from a centre parting"),
    ax("side-part pony", "側分馬尾", "a ponytail released from a side parting"),
    ax("face-frame pony", "修臉馬尾", "a ponytail with two strands left along the cheeks"),
    ax("twisted pony", "扭轉馬尾", "a ponytail with a twisted base"),
  ],
], true);

const bun = build("bun", [
  [
    ax("Crown", "頭頂", "placed on the crown"),
    ax("Nape", "後頸", "placed at the nape"),
    ax("Side", "側邊", "placed above one ear"),
    ax("Dual", "雙側", "placed as two matching knots"),
    ax("Mid", "中後", "placed at the mid-back of the head"),
  ],
  [
    ax("smooth bun", "光滑丸子頭", "a smooth rounded knot"),
    ax("messy bun", "鬆散丸子頭", "a loose unfinished knot with a few escaped strands"),
    ax("braided bun", "編髮丸子頭", "a knot wrapped from a braid"),
    ax("twisted bun", "扭轉丸子頭", "a knot built from twists"),
    ax("wrapped bun", "纏繞丸子頭", "a knot wrapped flat against the head"),
    ax("low bun", "低丸子頭", "a compact knot sitting on the nape"),
    ax("mini bun", "迷你丸子頭", "a very small knot"),
    ax("long bun", "長形丸子頭", "an elongated knot"),
    ax("flat bun", "扁平丸子頭", "a flat knot pinned close to the scalp"),
    ax("looped bun", "環形丸子頭", "a looped knot with a visible hole in the centre"),
  ],
], true);

const crop = build("crop", [
  [
    ax("Textured", "層次", "with textured pieces on top"),
    ax("Skin", "貼皮", "with the sides taken very close"),
    ax("French", "法式", "with a short fringe combed forward"),
    ax("Pixie", "精靈", "with longer texture on top and cropped sides"),
    ax("Undercut", "剃側", "with one side clipped close and the top left longer"),
  ],
  [
    ax("above-ear crop", "耳上短髮", "a close crop sitting above the ears"),
    ax("temple crop", "太陽穴短髮", "a crop that exposes the temples"),
    ax("nape crop", "後頸短髮", "a crop cleaned tight at the nape"),
    ax("rounded crop", "圓形短髮", "a rounded crop following the skull"),
    ax("piecey crop", "碎短髮", "a crop with separated pieces on top"),
    ax("forward crop", "前梳短髮", "a crop combed forward off the crown"),
    ax("side crop", "側分短髮", "a crop with a hard side parting"),
    ax("soft crop", "柔短髮", "a crop with a soft edge around the ear"),
    ax("barber crop", "理容短髮", "a barber crop with a sharp outline"),
    ax("cap crop", "貼頭蓋短髮", "a crop that follows the head like a cap"),
  ],
], true);

const tee = build("tee", [
  [
    ax("Heavyweight", "重磅", "in heavyweight jersey"),
    ax("Rib", "羅紋", "in fine rib jersey"),
    ax("Boxy", "箱型", "in a boxy jersey block"),
    ax("Close", "貼身", "in a close jersey block"),
    ax("Longline", "長版", "in a longline jersey that passes the hip"),
  ],
  [
    ax("crew tee", "圓領T恤", "a tee with a round crew neckline and a straight hem"),
    ax("scoop tee", "寬圓領T恤", "a tee with a wide scoop neckline"),
    ax("mock tee", "小高領T恤", "a tee with a mock neck band"),
    ax("raglan tee", "插肩T恤", "a tee with raglan sleeves"),
    ax("pocket tee", "口袋T恤", "a tee with one plain patch pocket"),
    ax("stripe tee", "橫條T恤", "a tee with even horizontal stripes and no lettering"),
    ax("cap-sleeve tee", "小蓋袖T恤", "a tee with short cap sleeves"),
    ax("drop tee", "落肩T恤", "a tee with a dropped shoulder seam"),
    ax("cropped tee", "短版T恤", "a tee cropped above the waist"),
    ax("padded tee", "墊肩T恤", "a tee with a light shoulder pad"),
  ],
], false);

const shirt = build("shirt", [
  [
    ax("Cotton", "棉", "in crisp cotton"),
    ax("Linen", "亞麻", "in washed linen"),
    ax("Silk", "真絲", "in fluid silk"),
    ax("Denim", "丹寧", "in rigid denim"),
    ax("Flannel", "法蘭絨", "in brushed flannel"),
  ],
  [
    ax("point shirt", "尖領襯衫", "a button-front shirt with a point collar"),
    ax("button-down shirt", "扣領襯衫", "a button-front shirt with a button-down collar"),
    ax("camp shirt", "古巴領襯衫", "a shirt with a camp collar worn open at the neck"),
    ax("band shirt", "立領襯衫", "a shirt with a band collar and a hidden placket"),
    ax("cuban shirt", "古巴襯衫", "a shirt with a spread cuban collar"),
    ax("over shirt", "外搭襯衫", "an overshirt worn open over a plain inner layer"),
    ax("poet shirt", "詩意襯衫", "a shirt with a full sleeve and a soft collar"),
    ax("western shirt", "西部襯衫", "a shirt with pointed yokes and snap closures, no embroidery text"),
    ax("tuxedo shirt", "禮服襯衫", "a shirt with a pleated front bib"),
    ax("popover shirt", "半襟襯衫", "a shirt with a short half-placket"),
  ],
], false);

const knit = build("knit", [
  [
    ax("Merino", "美麗諾", "in fine merino"),
    ax("Cotton", "棉", "in cotton knit"),
    ax("Cashmere", "羊絨", "in soft cashmere"),
    ax("Rib", "羅紋", "in vertical rib knit"),
    ax("Cable", "麻花", "in cable knit"),
  ],
  [
    ax("crew knit", "圓領針織衫", "a crewneck sweater with ribbed hem and cuffs"),
    ax("turtle knit", "高領針織衫", "a turtleneck sweater with a close folded neck"),
    ax("cardigan knit", "開襟針織衫", "a button-front cardigan"),
    ax("v-neck knit", "V領針織衫", "a V-neck sweater"),
    ax("cropped knit", "短版針織衫", "a cropped sweater ending at the waist"),
    ax("tunic knit", "長版針織衫", "a tunic sweater falling past the hip"),
    ax("polo knit", "Polo領針織衫", "a knit with a polo collar and a short placket"),
    ax("mock knit", "小高領針織衫", "a mock-neck sweater"),
    ax("zip knit", "拉鍊針織衫", "a sweater with a short quarter-zip"),
    ax("shaker knit", "鬆針針織衫", "a shaker-stitch sweater with an open gauge"),
  ],
], false);

const hoodie = build("hoodie", [
  [
    ax("Zip", "拉鍊", "as a full-zip hooded sweatshirt"),
    ax("Pullover", "套頭", "as a pullover hooded sweatshirt"),
    ax("Cropped", "短版", "as a cropped hooded sweatshirt"),
    ax("Longline", "長版", "as a longline hooded sweatshirt past the hip"),
    ax("Boxy", "箱型", "as a boxy hooded sweatshirt"),
  ],
  [
    ax("pouch hoodie", "袋鼠袋衛衣", "with a kangaroo pouch and a plain hood"),
    ax("half-zip hoodie", "半拉鍊衛衣", "with a half-zip under the hood"),
    ax("raw hoodie", "毛邊衛衣", "with a raw cut hem"),
    ax("split hoodie", "開衩衛衣", "with side splits at the hem"),
    ax("panel hoodie", "剪接衛衣", "with a shoulder panel seam"),
    ax("balloon hoodie", "氣球袖衛衣", "with a balloon sleeve"),
    ax("short-sleeve hoodie", "短袖衛衣", "with short sleeves and a hood"),
    ax("corset hoodie", "收腰衛衣", "with vertical seaming that narrows the waist"),
    ax("double hoodie", "雙層帽衛衣", "with a doubled hood"),
    ax("shoulder hoodie", "落肩衛衣", "with a dropped shoulder and a plain hood"),
  ],
], false);

const blazer = build("blazer", [
  [
    ax("Wool", "羊毛", "in wool suiting"),
    ax("Linen", "亞麻", "in linen"),
    ax("Cotton", "棉", "in cotton twill"),
    ax("Velvet", "絲絨", "in cotton velvet"),
    ax("Crepe", "縐紗", "in crepe"),
  ],
  [
    ax("single blazer", "單排西裝外套", "a single-breasted blazer with notch lapels"),
    ax("double blazer", "雙排西裝外套", "a double-breasted blazer with peaked lapels"),
    ax("cropped blazer", "短版西裝外套", "a cropped blazer ending at the waist"),
    ax("long blazer", "長版西裝外套", "a longline blazer ending at the thigh"),
    ax("shawl blazer", "青果領西裝外套", "a blazer with a shawl collar"),
    ax("collarless blazer", "無領西裝外套", "a collarless blazer with a clean neckline"),
    ax("oversized blazer", "寬鬆西裝外套", "an oversized blazer with padded shoulders"),
    ax("fitted blazer", "修身西裝外套", "a fitted blazer nipped at the waist"),
    ax("sleeve-rolled blazer", "捲袖西裝外套", "a blazer with the sleeves rolled once"),
    ax("belted blazer", "束腰西裝外套", "a blazer closed with a self belt"),
  ],
], false);

const jacket = build("jacket", [
  [
    ax("Cropped", "短版", "cropped to the waist"),
    ax("Hip", "及臀", "ending at the hip"),
    ax("Thigh", "及腿", "ending at the upper thigh"),
    ax("Waist", "及腰", "ending at the natural waist"),
    ax("Long", "長版", "ending below the hip"),
  ],
  [
    ax("bomber jacket", "飛行外套", "a bomber jacket with ribbed cuffs and a zip front"),
    ax("trucker jacket", "卡車外套", "a denim trucker jacket with metal buttons and two chest pockets"),
    ax("field jacket", "野外外套", "a field jacket with four flap pockets"),
    ax("coach jacket", "教練外套", "a lightweight coach jacket with a snap front"),
    ax("harrington jacket", "哈靈頓外套", "a harrington jacket with a tartan-free plain lining shown at the collar"),
    ax("moto jacket", "機車外套", "a moto jacket with an asymmetric zip"),
    ax("shirt jacket", "襯衫外套", "a shirt-jacket with a point collar and a button front"),
    ax("puffer jacket", "羽絨外套", "a quilted puffer jacket with a stand collar"),
    ax("wind jacket", "防風外套", "a thin wind jacket with an elastic hem"),
    ax("varsity jacket", "校隊外套", "a varsity jacket with a wool body, leather sleeves, and no letters"),
  ],
], false);

const coat = build("coat", [
  [
    ax("Wool", "羊毛", "in wool"),
    ax("Cotton", "棉", "in cotton gabardine"),
    ax("Cashmere", "羊絨", "in cashmere"),
    ax("Nylon", "尼龍", "in matte nylon"),
    ax("Boucle", "圈呢", "in boucle"),
  ],
  [
    ax("trench coat", "風衣大衣", "a double-breasted trench coat belted at the waist and falling to the knee"),
    ax("overcoat", "長大衣", "a single-breasted overcoat falling below the knee"),
    ax("cocoon coat", "繭型大衣", "a cocoon coat with a rounded shoulder and no lapel"),
    ax("wrap coat", "交疊大衣", "a wrap coat closed by a tie belt"),
    ax("duster coat", "塵衣大衣", "a duster coat falling toward the ankle"),
    ax("pea coat", "海軍大衣", "a short double-breasted pea coat ending at the hip"),
    ax("cape coat", "披風大衣", "a cape coat with arm slits"),
    ax("puffer coat", "長羽絨大衣", "a long quilted puffer coat"),
    ax("robe coat", "浴袍大衣", "a robe coat with a shawl collar"),
    ax("column coat", "直筒大衣", "a column coat with a narrow shoulder and a straight hem"),
  ],
], false);

const tank = build("tank", [
  [
    ax("Rib", "羅紋", "in rib knit"),
    ax("Silk", "真絲", "in silk"),
    ax("Jersey", "汗布", "in jersey"),
    ax("Satin", "緞面", "in satin"),
    ax("Mesh", "網布", "in fine mesh"),
  ],
  [
    ax("crew tank", "圓領背心", "a tank with a high round neck and wide armholes"),
    ax("camisole tank", "細肩背心", "a camisole with thin straps and a straight neckline"),
    ax("halter tank", "繞頸背心", "a halter tank tying behind the neck"),
    ax("square tank", "方領背心", "a tank with a square neckline"),
    ax("racer tank", "工字背心", "a racerback tank"),
    ax("muscle tank", "挖肩背心", "a muscle tank with deep armholes"),
    ax("cropped tank", "短版背心", "a tank cropped above the waist"),
    ax("longline tank", "長版背心", "a tank falling past the hip"),
    ax("cowl tank", "垂領背心", "a tank with a soft cowl neck"),
    ax("bind tank", "包邊背心", "a tank finished with a narrow binding at the neck"),
  ],
], false);

const dress = build("dress", [
  [
    ax("Scoop", "圓領", "with a scoop neckline"),
    ax("Square", "方領", "with a square neckline"),
    ax("Halter", "繞頸", "with a halter neckline"),
    ax("High-neck", "高領", "with a high neckline"),
    ax("Sweetheart", "心形領", "with a sweetheart neckline"),
  ],
  [
    ax("column dress", "直筒連身裙", "a one-piece column dress whose skirt is the same garment, ending at mid-calf"),
    ax("slip dress", "吊帶連身裙", "a one-piece bias slip dress cut to the ankle"),
    ax("shirt dress", "襯衫連身裙", "a one-piece shirt dress buttoned from collar to a knee hem"),
    ax("knit dress", "針織連身裙", "a one-piece knit dress with a polo collar and a straight skirt"),
    ax("bubble dress", "泡泡連身裙", "a one-piece dress with a bubble skirt ending on the upper thigh"),
    ax("midi dress", "中長連身裙", "a one-piece dress with a fitted bodice and a midi skirt"),
    ax("maxi dress", "長連身裙", "a one-piece dress falling to the ankle"),
    ax("wrap dress", "交疊連身裙", "a one-piece wrap dress closing in a V to the knee"),
    ax("flare dress", "傘狀連身裙", "a one-piece fit-and-flare dress ending at the knee"),
    ax("asymmetric dress", "不規則連身裙", "a one-piece dress with an asymmetric hem"),
  ],
], false);

const polo = build("polo", [
  [
    ax("Pique", "珠地", "in cotton pique"),
    ax("Merino", "美麗諾", "in merino knit"),
    ax("Silk", "真絲", "in silk knit"),
    ax("Terry", "毛圈", "in french terry"),
    ax("Rib", "羅紋", "in rib knit"),
  ],
  [
    ax("classic polo", "經典Polo衫", "a polo with a rib collar and a two-button placket"),
    ax("long-sleeve polo", "長袖Polo衫", "a long-sleeve polo with a rib collar"),
    ax("cropped polo", "短版Polo衫", "a cropped polo ending at the waist"),
    ax("oversized polo", "寬鬆Polo衫", "an oversized polo with a deep placket"),
    ax("zip polo", "拉鍊Polo衫", "a polo closed with a short zip instead of buttons"),
    ax("johnny polo", "無領Polo衫", "a polo with a soft johnny collar"),
    ax("tipped polo", "包邊Polo衫", "a polo with a plain contrast binding on the collar and no logo"),
    ax("tennis polo", "網球Polo衫", "a fitted polo shaped for a tennis court"),
    ax("rugby polo", "橄欖球Polo衫", "a heavy polo with a sturdy collar"),
    ax("sleeveless polo", "無袖Polo衫", "a sleeveless polo with a rib collar"),
  ],
], false);

const sneaker = build("sneaker", [
  [
    ax("Leather", "皮革", "with a smooth leather upper"),
    ax("Suede", "麂皮", "with a suede upper"),
    ax("Knit", "針織", "with a knit upper"),
    ax("Canvas", "帆布", "with a canvas upper"),
    ax("Mesh", "網布", "with a mesh upper"),
  ],
  [
    ax("court sneaker", "球場波鞋", "a low court trainer with a clean toe and a gum outsole"),
    ax("cup sneaker", "杯底波鞋", "a low trainer with a cupped sole and a padded collar"),
    ax("runner sneaker", "跑鞋", "a running shoe with a thick foam midsole"),
    ax("slim sneaker", "薄底波鞋", "a slim low-profile trainer with a thin sole"),
    ax("chunky sneaker", "厚底波鞋", "a chunky trainer with a tall sculpted sole"),
    ax("high-top sneaker", "高筒波鞋", "a high-top trainer covering the ankle"),
    ax("slip sneaker", "套腳波鞋", "a laceless slip-on trainer"),
    ax("panel sneaker", "拼塊波鞋", "a trainer with curved overlay panels and no logo"),
    ax("terrace sneaker", "復古波鞋", "a low trainer with a gum terrace sole"),
    ax("split-toe sneaker", "分趾波鞋", "a low trainer with a split toe seam"),
  ],
], false);

const boot = build("boot", [
  [
    ax("Leather", "皮革", "in smooth leather"),
    ax("Suede", "麂皮", "in suede"),
    ax("Canvas", "帆布", "in canvas"),
    ax("Nylon", "尼龍", "in matte nylon"),
    ax("Patent", "漆皮", "in patent leather"),
  ],
  [
    ax("ankle boot", "短靴", "an ankle boot with a side zip and a low block heel"),
    ax("chelsea boot", "切爾西靴", "a chelsea boot with elastic side gores"),
    ax("combat boot", "軍靴", "a combat boot with a lug sole and eyelets"),
    ax("knee boot", "及膝靴", "a boot with a smooth shaft rising to the knee"),
    ax("cowboy boot", "牛仔靴", "a western boot with a stacked heel and decorative stitching, no text"),
    ax("chukka boot", "丘卡靴", "a chukka boot at ankle height with two eyelet pairs"),
    ax("engineer boot", "工程靴", "an engineer boot with a strap and buckle"),
    ax("lug boot", "齒底靴", "an ankle boot with a deep lug sole"),
    ax("harness boot", "束帶靴", "a harness boot with a ring and strap"),
    ax("rain boot", "雨靴", "a matte rain boot at calf height"),
  ],
], false);

const heel = build("heel", [
  [
    ax("Pump", "包頭", "as a closed pump"),
    ax("Mule", "穆勒", "as a backless mule"),
    ax("Sling", "後絆", "as a slingback"),
    ax("Strappy", "綁帶", "as a strappy sandal-heel"),
    ax("Bootie", "靴型", "as an ankle bootie"),
  ],
  [
    ax("stiletto heel", "細跟高跟鞋", "with a thin stiletto heel and a pointed toe"),
    ax("block heel", "粗跟高跟鞋", "with a straight block heel"),
    ax("kitten heel", "矮跟高跟鞋", "with a low kitten heel"),
    ax("cone heel", "錐跟高跟鞋", "with a cone heel"),
    ax("flare heel", "喇叭跟高跟鞋", "with a flared heel"),
    ax("platform heel", "厚底高跟鞋", "with a platform forefoot and a heel"),
    ax("sculpted heel", "造型跟高跟鞋", "with a sculpted curved heel"),
    ax("comma heel", "逗號跟高跟鞋", "with a comma-shaped heel"),
    ax("spool heel", "線軸跟高跟鞋", "with a spool heel"),
    ax("triangle heel", "三角跟高跟鞋", "with a triangular heel"),
  ],
], false);

const sandal = build("sandal", [
  [
    ax("Leather", "皮革", "in leather"),
    ax("Suede", "麂皮", "in suede"),
    ax("Nylon", "尼龍", "in nylon webbing"),
    ax("Raffia", "拉菲草", "in raffia"),
    ax("Rubber", "橡膠", "in moulded rubber"),
  ],
  [
    ax("two-strap sandal", "雙帶涼鞋", "an open-toe sandal with two wide straps"),
    ax("toe-thong sandal", "人字涼鞋", "a thong sandal with a Y-shaped strap"),
    ax("slide sandal", "一片涼鞋", "a slide with one wide strap"),
    ax("gladiator sandal", "羅馬涼鞋", "a flat gladiator sandal with crisscross straps"),
    ax("ankle-strap sandal", "腳踝涼鞋", "an open-toe sandal with an ankle strap"),
    ax("fisherman sandal", "漁夫涼鞋", "a closed-toe fisherman sandal"),
    ax("sport sandal", "運動涼鞋", "a sport sandal with adjustable straps"),
    ax("platform sandal", "厚底涼鞋", "a platform sandal with a cork-look wedge"),
    ax("toe-ring sandal", "趾環涼鞋", "a sandal with a toe ring and an ankle strap"),
    ax("caged sandal", "籠狀涼鞋", "a caged sandal of many thin straps"),
  ],
], false);

const loafer = build("loafer", [
  [
    ax("Leather", "皮革", "in smooth leather"),
    ax("Suede", "麂皮", "in suede"),
    ax("Patent", "漆皮", "in patent leather"),
    ax("Croc", "壓紋", "in an embossed reptile texture with no logo"),
    ax("Nubuck", "磨砂", "in nubuck"),
  ],
  [
    ax("penny loafer", "便士樂福鞋", "a loafer with a leather strap across the vamp"),
    ax("tassel loafer", "流蘇樂福鞋", "a loafer with a tassel on the vamp"),
    ax("bit loafer", "馬銜樂福鞋", "a loafer with a metal bit across the vamp"),
    ax("kiltie loafer", "流蘇蓋樂福鞋", "a loafer with a fringed kiltie"),
    ax("driving loafer", "駕車樂福鞋", "a driving loafer with a pebbled sole"),
    ax("lug loafer", "厚底樂福鞋", "a loafer on a lug sole"),
    ax("split-toe loafer", "分趾樂福鞋", "a loafer with a split toe"),
    ax("apron loafer", "阿普龍樂福鞋", "a loafer with an apron toe seam"),
    ax("chain loafer", "鏈飾樂福鞋", "a loafer with a slim metal chain across the vamp and no logo"),
    ax("collapsible loafer", "軟跟樂福鞋", "a loafer with a collapsible heel counter"),
  ],
], false);

const flat = build("flat", [
  [
    ax("Leather", "皮革", "in leather"),
    ax("Suede", "麂皮", "in suede"),
    ax("Mesh", "網布", "in mesh"),
    ax("Satin", "緞面", "in satin"),
    ax("Patent", "漆皮", "in patent leather"),
  ],
  [
    ax("ballet flat", "芭蕾平底鞋", "a ballet flat with a tiny bow and a thin sole"),
    ax("square flat", "方頭平底鞋", "a square-toe flat with no ornament"),
    ax("point flat", "尖頭平底鞋", "a pointed-toe flat"),
    ax("mary-jane flat", "瑪麗珍平底鞋", "a flat with one instep strap"),
    ax("sling flat", "後空平底鞋", "a slingback flat with no heel lift"),
    ax("dorsay flat", "側空平底鞋", "a d'Orsay flat cut away at the sides"),
    ax("cap-toe flat", "包頭平底鞋", "a flat with a cap toe seam"),
    ax("woven flat", "編織平底鞋", "a flat with a woven vamp"),
    ax("strap flat", "丁字平底鞋", "a flat with a T-strap"),
    ax("round flat", "圓頭平底鞋", "a round-toe flat with a plain vamp"),
  ],
], false);

const hairBuilt = merge([bob, longHair, waves, curls, bangs, braid, updo, pony, bun, crop]);
const topBuilt = merge([tee, shirt, knit, hoodie, blazer, jacket, coat, tank, dress, polo]);
const pantsBuilt = merge([jeans, mini, midi, maxi, shorts, cargo, legging, trouser, wide, skort]);
const shoeBuilt = merge([sneaker, boot, heel, sandal, loafer, flat]);

export const SILHOUETTE_HAIR: readonly CharacterLookOption[] = hairBuilt.options;
export const SILHOUETTE_TOPS: readonly CharacterLookOption[] = topBuilt.options;
export const SILHOUETTE_PANTS: readonly CharacterLookOption[] = pantsBuilt.options;
export const SILHOUETTE_SHOES: readonly CharacterLookOption[] = shoeBuilt.options;

export const SILHOUETTE_DRESS_IDS: readonly string[] = dress.options.map((option) => option.id);

export const SILHOUETTE_LABELS_EN = {
  hair: hairBuilt.en,
  top: topBuilt.en,
  pants: pantsBuilt.en,
  shoes: shoeBuilt.en,
};

export const SILHOUETTE_LABELS_ZH = {
  hair: hairBuilt.zh,
  top: topBuilt.zh,
  pants: pantsBuilt.zh,
  shoes: shoeBuilt.zh,
};
