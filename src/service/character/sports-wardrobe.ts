// Multi-sport athletic apparel, footwear, and gear across Tennis, Basketball, Football/Soccer,
// Running/Marathon, Yoga/Pilates, Cycling, Golf, Boxing/MMA, Swimming/Surfing, Skiing/Snowboarding,
// Baseball, and Hiking/Trail.
// Each prompt ends with "Isolated wardrobe piece <id>." so detection matches uniquely.
import type { CharacterLookOption } from "@/service/character/character-look";

export const SPORTS_TOPS: readonly CharacterLookOption[] = [
  {
    id: "sptennispolo",
    prompt:
      "Crisp white performance piqué tennis polo shirt with forest-green and navy striped ribbed collar and sleeve cuffs. Isolated wardrobe piece sptennispolo.",
  },
  {
    id: "sptennisdress",
    prompt:
      "Sleek white sleeveless athletic tennis dress featuring a racerback bodice, contoured seams, and a pleated mini skirt hem. Isolated wardrobe piece sptennisdress.",
  },
  {
    id: "spbballjersey",
    prompt:
      "Championship gold-and-purple breathable mesh sleeveless basketball jersey with bold stitched team numerals and striped rib trim. Isolated wardrobe piece spbballjersey.",
  },
  {
    id: "spsoccerkit",
    prompt:
      "Classic red-and-white athletic football soccer jersey shirt with a retro fold-over collar, woven crest badge, and moisture-wicking fabric. Isolated wardrobe piece spsoccerkit.",
  },
  {
    id: "sprunnersinglet",
    prompt:
      "Ultra-lightweight neon volt-lime perforated marathon running singlet vest with reflective chest stripes and racerback cut. Isolated wardrobe piece sprunnersinglet.",
  },
  {
    id: "spyogawraptop",
    prompt:
      "Soft dusty-sage ribbed modal pilates ballet wrap crop top with long fitted sleeves and a waist tie ribbon. Isolated wardrobe piece spyogawraptop.",
  },
  {
    id: "sppilateshalterbra",
    prompt:
      "Sculpting espresso-brown seamless compression yoga sports bra top with a square neckline and wide supportive straps. Isolated wardrobe piece sppilateshalterbra.",
  },
  {
    id: "spcyclingjersey",
    prompt:
      "Aerodynamic pro road-cycling short-sleeve zip jersey in cobalt blue and high-vis orange with three rear cargo pockets and stand collar. Isolated wardrobe piece spcyclingjersey.",
  },
  {
    id: "spgolfquarterzip",
    prompt:
      "Country-club cream performance stretch-knit golf quarter-zip pullover layered over a collared polo with tonal piping. Isolated wardrobe piece spgolfquarterzip.",
  },
  {
    id: "spboxinghoodie",
    prompt:
      "Satin championship boxing ring walkout sleeveless hooded robe jacket in black with metallic gold trim and wide belt sash. Isolated wardrobe piece spboxinghoodie.",
  },
  {
    id: "spsurfrashguard",
    prompt:
      "Fitted long-sleeve neoprene and UV-lycra surf rashguard swim top in Pacific teal and white color-block panels with front zip. Isolated wardrobe piece spsurfrashguard.",
  },
  {
    id: "spskiparka",
    prompt:
      "Alpine waterproof Gore-Tex ski and snowboard shell jacket in信号-red and white with snow-gaiter hood, ski-pass sleeve pocket, and sealed zips. Isolated wardrobe piece spskiparka.",
  },
  {
    id: "spbaseballjersey",
    prompt:
      "Classic cream-and-navy pinstripe button-front baseball jersey shirt with raglan sleeves and stitched chest lettering. Isolated wardrobe piece spbaseballjersey.",
  },
  {
    id: "spcompressiontop",
    prompt:
      "Matte carbon-black long-sleeve athletic compression base-layer training top with ergonomic flatlock silver seams. Isolated wardrobe piece spcompressiontop.",
  },
];

export const SPORTS_PANTS: readonly CharacterLookOption[] = [
  {
    id: "sptennispleatskort",
    prompt:
      "Crisp white high-waisted pleated athletic tennis skort with built-in compression shorts and forest-green waistband piping. Isolated wardrobe piece sptennispleatskort.",
  },
  {
    id: "spbballmeshshorts",
    prompt:
      "Knee-length heavyweight gold-and-purple breathable mesh basketball shorts with striped knit waistband and side vents. Isolated wardrobe piece spbballmeshshorts.",
  },
  {
    id: "spsoccershorts",
    prompt:
      "Athletic white football soccer pitch shorts with red side three-stripe detailing and an elastic drawstring waist. Isolated wardrobe piece spsoccershorts.",
  },
  {
    id: "sprunsplitshorts",
    prompt:
      "Featherweight black marathon split running shorts with an inner brief liner, reflective trim, and high side vents. Isolated wardrobe piece sprunsplitshorts.",
  },
  {
    id: "spyogaflarepants",
    prompt:
      "High-waisted espresso-brown buttery-soft stretch yoga and pilates flare leggings with a crossover V-waistband. Isolated wardrobe piece spyogaflarepants.",
  },
  {
    id: "spcyclingbibshorts",
    prompt:
      "Pro aerodynamic matte-black Lycra padded road cycling shorts with silicone leg grippers and subtle team stripe. Isolated wardrobe piece spcyclingbibshorts.",
  },
  {
    id: "spgolfpleatedskort",
    prompt:
      "Tailored navy-blue stretch-twill ladies golf skort with front box pleats and tee pocket detailing. Isolated wardrobe piece spgolfpleatedskort.",
  },
  {
    id: "spgolfchinos",
    prompt:
      "Tailored stone-beige technical four-way-stretch men's golf trousers with a crisp center crease and breathable weave. Isolated wardrobe piece spgolfchinos.",
  },
  {
    id: "spboxingsatinshorts",
    prompt:
      "High-waisted black-and-gold satin championship boxing trunks with a wide elastic championship waistband and side slits. Isolated wardrobe piece spboxingsatinshorts.",
  },
  {
    id: "spsurfboardshorts",
    prompt:
      "Quick-dry Pacific-teal and sunset-coral striped surf boardshorts with a lace-up waistband and side zip pocket. Isolated wardrobe piece spsurfboardshorts.",
  },
  {
    id: "spskisnowpants",
    prompt:
      "Insulated waterproof white-and-black alpine ski and snowboard bib trousers with reinforced scuff guards and zip vents. Isolated wardrobe piece spskisnowpants.",
  },
  {
    id: "spcompressiontights",
    prompt:
      "Full-length matte black athletic running and gym compression tights with ergonomic knee paneling and ankle zips. Isolated wardrobe piece spcompressiontights.",
  },
];

export const SPORTS_SHOES: readonly CharacterLookOption[] = [
  {
    id: "spcarbonmarathonz",
    prompt:
      "Neon volt-lime and white carbon-plated marathon racing running shoes with an ultra-thick sculpted ZoomX foam midsole. Isolated wardrobe piece spcarbonmarathonz.",
  },
  {
    id: "spbballhightop",
    prompt:
      "Signature championship high-top basketball sneakers in bred black, varsity red, and white leather with visible air cushioning. Isolated wardrobe piece spbballhightop.",
  },
  {
    id: "spsoccercleats",
    prompt:
      "Metallic silver and electric-blue firm-ground football soccer cleats with a knitted sock collar and molded pitch studs. Isolated wardrobe piece spsoccercleats.",
  },
  {
    id: "sptenniscourt",
    prompt:
      "All-court pro tennis shoes in crisp white leather and breathable mesh with herringbone clay-and-hardcourt outsole and green accents. Isolated wardrobe piece sptenniscourt.",
  },
  {
    id: "spgolfspikeless",
    prompt:
      "Classic white-and-tan saddle leather spikeless golf shoes with kiltie fringe detail and turf-grip dimpled outsole. Isolated wardrobe piece spgolfspikeless.",
  },
  {
    id: "spcyclingcleats",
    prompt:
      "Sleek matte-white carbon-sole road cycling shoes with dual BOA dial wire closures and aerodynamic perforations. Isolated wardrobe piece spcyclingcleats.",
  },
  {
    id: "spboxingboots",
    prompt:
      "High-top black-and-gold lace-up championship boxing ring boots with breathable mesh panels and thin pivot rubber soles. Isolated wardrobe piece spboxingboots.",
  },
  {
    id: "sppilatesgripsocks",
    prompt:
      "Cream ribbed organic-cotton crew pilates and yoga barre socks with ballet-style crossover elastic straps and silicone grip soles. Isolated wardrobe piece sppilatesgripsocks.",
  },
  {
    id: "sptrailrunners",
    prompt:
      "Rugged earth-olive and burnt-orange Gore-Tex trail running shoes with aggressive Vibram lugged soles and quick-lace system. Isolated wardrobe piece sptrailrunners.",
  },
  {
    id: "spsnowboardboots",
    prompt:
      "Chunky alpine ski and snowboard boots in matte charcoal and neon orange with BOA dial lacing and thermal liner. Isolated wardrobe piece spsnowboardboots.",
  },
  {
    id: "spliftingflat",
    prompt:
      "Powerlifting and gym training shoes in gum-sole canvas and black suede with a raised wooden heel wedge and midfoot strap. Isolated wardrobe piece spliftingflat.",
  },
  {
    id: "spbadmintoncourt",
    prompt:
      "Lightweight indoor badminton and volleyball court shoes in white and royal blue with non-marking gum rubber hex-grip soles. Isolated wardrobe piece spbadmintoncourt.",
  },
];

export const SPORTS_ACCESSORIES: readonly CharacterLookOption[] = [
  {
    id: "sptennisvisor",
    prompt:
      "Crisp white athletic tennis sun visor cap paired with matching terry-cloth wrist sweatbands. Isolated wardrobe piece sptennisvisor.",
  },
  {
    id: "spboxinggloves",
    prompt:
      "Pair of championship 12oz leather boxing gloves in glossy black and gold hung across the shoulders. Isolated wardrobe piece spboxinggloves.",
  },
  {
    id: "spcyclinghelmet",
    prompt:
      "Aerodynamic matte-white road cycling helmet paired with iridescent polarized wrap-around cycling sunglasses. Isolated wardrobe piece spcyclinghelmet.",
  },
  {
    id: "spskogoggles",
    prompt:
      "Frameless mirrored-lens alpine ski and snowboard goggles resting on a warm knit winter helmet beanie. Isolated wardrobe piece spskogoggles.",
  },
  {
    id: "spyogamatstrap",
    prompt:
      "Rolled sage-green natural rubber yoga mat carried on a woven canvas shoulder sling strap. Isolated wardrobe piece spyogamatstrap.",
  },
  {
    id: "sprunningvest",
    prompt:
      "Ultralight marathon trail-running hydration vest pack with dual soft-flask water bottles on the chest straps. Isolated wardrobe piece sprunningvest.",
  },
];

export const SPORTS_LABELS_EN = {
  top: {
    sptennispolo: "Pro Tennis Club Polo",
    sptennisdress: "Pleated Tennis Court Dress",
    spbballjersey: "Championship Basketball Jersey",
    spsoccerkit: "Retro Football Soccer Jersey",
    sprunnersinglet: "Marathon Racing Singlet",
    spyogawraptop: "Pilates Ballet Wrap Top",
    sppilateshalterbra: "Sculpt Yoga Sports Bra",
    spcyclingjersey: "Pro Road Cycling Jersey",
    spgolfquarterzip: "Country-Club Golf Quarter-Zip",
    spboxinghoodie: "Satin Boxing Walkout Robe",
    spsurfrashguard: "Zip Surf Rashguard Top",
    spskiparka: "Alpine Gore-Tex Ski Jacket",
    spbaseballjersey: "Pinstripe Baseball Jersey",
    spcompressiontop: "Pro Compression Base Layer",
  },
  pants: {
    sptennispleatskort: "Pleated Tennis Skort",
    spbballmeshshorts: "Mesh Basketball Shorts",
    spsoccershorts: "Pitch Football Shorts",
    sprunsplitshorts: "Marathon Split Running Shorts",
    spyogaflarepants: "Crossover Yoga Flare Pants",
    spcyclingbibshorts: "Aero Padded Cycling Shorts",
    spgolfpleatedskort: "Tailored Golf Skort",
    spgolfchinos: "Stretch Tour Golf Trousers",
    spboxingsatinshorts: "Satin Boxing Ring Trunks",
    spsurfboardshorts: "Striped Surf Boardshorts",
    spskisnowpants: "Waterproof Alpine Ski Pants",
    spcompressiontights: "Pro Running Compression Tights",
  },
  shoes: {
    spcarbonmarathonz: "Carbon-Plate Marathon Runners",
    spbballhightop: "Pro High-Top Basketball Shoes",
    spsoccercleats: "Firm-Ground Football Cleats",
    sptenniscourt: "All-Court Pro Tennis Shoes",
    spgolfspikeless: "Saddle Leather Golf Shoes",
    spcyclingcleats: "BOA Carbon Road Cycling Shoes",
    spboxingboots: "High-Top Boxing Ring Boots",
    sppilatesgripsocks: "Strappy Pilates Grip Socks",
    sptrailrunners: "Vibram Lug Trail Runners",
    spsnowboardboots: "Alpine Snowboard & Ski Boots",
    spliftingflat: "Wedge-Heel Gym Lifting Shoes",
    spbadmintoncourt: "Gum-Sole Indoor Court Shoes",
  },
  accessory: {
    sptennisvisor: "Tennis Sun Visor & Wristbands",
    spboxinggloves: "Pro Leather Boxing Gloves",
    spcyclinghelmet: "Aero Cycling Helmet & Shades",
    spskogoggles: "Mirrored Alpine Ski Goggles",
    spyogamatstrap: "Rolled Yoga Mat & Sling",
    sprunningvest: "Marathon Hydration Vest",
  },
} as const;

export const SPORTS_LABELS_ZH = {
  top: {
    sptennispolo: "網球俱樂部撞色領 Polo 衫",
    sptennisdress: "百褶連身專業網球洋裝",
    spbballjersey: "冠軍紫金網眼無袖籃球球衣",
    spsoccerkit: "復古翻領紅白足球球衣",
    sprunnersinglet: "螢光綠馬拉松競速透氣背心",
    spyogawraptop: "普拉提芭蕾風綁帶短版罩衫",
    sppilateshalterbra: "深棕高支撐方領瑜珈運動內衣",
    spcyclingjersey: "專業破風公路單車拉鍊車衣",
    spgolfquarterzip: "高爾夫俱樂部半拉鍊針織衫",
    spboxinghoodie: "黑金緞面連帽拳擊出場戰袍",
    spsurfrashguard: "撞色防曬拉鍊衝浪長袖泳衣",
    spskiparka: "高山防水機能滑雪衝鋒外套",
    spbaseballjersey: "經典細條紋排釦棒球球衣",
    spcompressiontop: "碳黑專業高彈力運動緊身長袖",
  },
  pants: {
    sptennispleatskort: "高腰百褶防走光網球短裙",
    spbballmeshshorts: "重磅透氣網眼及膝籃球短褲",
    spsoccershorts: "白底紅三線專業足球短褲",
    sprunsplitshorts: "超輕量高開衩馬拉松跑褲",
    spyogaflarepants: "交叉高腰提臀微喇瑜珈長褲",
    spcyclingbibshorts: "專業高彈破風單車車褲",
    spgolfpleatedskort: "深藍百褶高爾夫球短裙",
    spgolfchinos: "四面彈力挺括高爾夫球長褲",
    spboxingsatinshorts: "黑金緞面高腰拳擊比賽短褲",
    spsurfboardshorts: "快乾撞色綁帶海灘衝浪短褲",
    spskisnowpants: "防水保暖高山滑雪吊帶長褲",
    spcompressiontights: "專業全掌壓縮慢跑訓練長褲",
  },
  shoes: {
    spcarbonmarathonz: "螢光綠碳板厚底馬拉松跑鞋",
    spbballhightop: "黑紅氣墊高筒實戰籃球鞋",
    spsoccercleats: "銀藍編織襪套釘鞋（足球鞋）",
    sptenniscourt: "白綠專業全場地網球鞋",
    spgolfspikeless: "復古雙色真皮無釘高爾夫球鞋",
    spcyclingcleats: "碳纖維底旋鈕公路車卡鞋",
    spboxingboots: "黑金高筒輕量拳擊擂台戰靴",
    sppilatesgripsocks: "芭蕾交叉帶止滑普拉提襪",
    sptrailrunners: "防水深齒大底越野跑鞋",
    spsnowboardboots: "旋鈕鎖緊保暖滑雪雪靴",
    spliftingflat: "魔鬼氈木跟重訓深蹲舉重鞋",
    spbadmintoncourt: "生膠底防滑室內羽球／排球鞋",
  },
  accessory: {
    sptennisvisor: "網球遮陽空頂帽配護腕",
    spboxinggloves: "黑金真皮專業拳擊手套",
    spcyclinghelmet: "破風單車頭盔配偏光風鏡",
    spskogoggles: "無框炫彩鍍膜滑雪護目鏡",
    spyogamatstrap: "鼠尾草綠背帶瑜珈墊",
    sprunningvest: "越野馬拉松雙水壺補給背心",
  },
} as const;
