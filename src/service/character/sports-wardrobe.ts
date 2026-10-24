// Multi-sport athletic apparel, footwear, and gear across Tennis, Pickleball (Peek-A-Boo skorts),
// Basketball, Football/Soccer, Running/Marathon, Yoga/Pilates, Cycling, Golf, Boxing/MMA,
// Swimming/Surfing, Skiing/Snowboarding, Baseball, Hiking/Trail, and Climbing.
// Distilled from IG athletic creator & brand research (aloyoga, blogilates, pickleballcentral,
// ppa_tour, wilson, vuoriclothing, blackdiamond).
// Each prompt ends with "Isolated wardrobe piece <id>." so detection matches uniquely.
import type { CharacterLookOption } from "@/service/character/character-look";

export const SPORTS_TOPS: readonly CharacterLookOption[] = [
  {
    id: "sptennispolo",
    description: "Crisp white performance piqué tennis club polo with striped collar.",
    tags: ["tennis", "pickleball", "athletic", "summer"],
    prompt:
      "Crisp white performance piqué tennis polo shirt with forest-green and navy striped ribbed collar and sleeve cuffs. Isolated wardrobe piece sptennispolo.",
  },
  {
    id: "sptennisdress",
    description: "Sleek white pleated sleeveless tennis court dress.",
    tags: ["tennis", "pickleball", "athletic", "summer"],
    prompt:
      "Sleek white sleeveless athletic tennis dress featuring a racerback bodice, contoured seams, and a pleated mini skirt hem. Isolated wardrobe piece sptennisdress.",
  },
  {
    id: "spbballjersey",
    description: "Gold-and-purple breathable mesh championship basketball jersey.",
    tags: ["basketball", "athletic", "street"],
    prompt:
      "Championship gold-and-purple breathable mesh sleeveless basketball jersey with bold stitched team numerals and striped rib trim. Isolated wardrobe piece spbballjersey.",
  },
  {
    id: "spsoccerkit",
    description: "Retro red-and-white fold-over collar football soccer jersey.",
    tags: ["soccer", "athletic", "street"],
    prompt:
      "Classic red-and-white athletic football soccer jersey shirt with a retro fold-over collar, woven crest badge, and moisture-wicking fabric. Isolated wardrobe piece spsoccerkit.",
  },
  {
    id: "sprunnersinglet",
    description: "Ultralight neon volt-lime perforated marathon running singlet.",
    tags: ["running", "athletic", "summer"],
    prompt:
      "Ultra-lightweight neon volt-lime perforated marathon running singlet vest with reflective chest stripes and racerback cut. Isolated wardrobe piece sprunnersinglet.",
  },
  {
    id: "spyogawraptop",
    description: "Dusty-sage ribbed modal pilates ballet wrap crop top.",
    tags: ["yoga", "pilates", "athletic", "casual"],
    prompt:
      "Soft dusty-sage ribbed modal pilates ballet wrap crop top with long fitted sleeves and a waist tie ribbon. Isolated wardrobe piece spyogawraptop.",
  },
  {
    id: "sppilateshalterbra",
    description: "Sculpting espresso-brown square-neck yoga sports bra.",
    tags: ["yoga", "pilates", "athletic"],
    prompt:
      "Sculpting espresso-brown seamless compression yoga sports bra top with a square neckline and wide supportive straps. Isolated wardrobe piece sppilateshalterbra.",
  },
  {
    id: "spcyclingjersey",
    description: "Aerodynamic cobalt and high-vis pro road-cycling zip jersey.",
    tags: ["cycling", "athletic"],
    prompt:
      "Aerodynamic pro road-cycling short-sleeve zip jersey in cobalt blue and high-vis orange with three rear cargo pockets and stand collar. Isolated wardrobe piece spcyclingjersey.",
  },
  {
    id: "spgolfquarterzip",
    description: "Country-club cream stretch-knit golf quarter-zip over polo.",
    tags: ["golf", "athletic", "casual"],
    prompt:
      "Country-club cream performance stretch-knit golf quarter-zip pullover layered over a collared polo with tonal piping. Isolated wardrobe piece spgolfquarterzip.",
  },
  {
    id: "spboxinghoodie",
    description: "Black-and-gold satin boxing ring walkout hooded robe.",
    tags: ["boxing", "athletic"],
    prompt:
      "Satin championship boxing ring walkout sleeveless hooded robe jacket in black with metallic gold trim and wide belt sash. Isolated wardrobe piece spboxinghoodie.",
  },
  {
    id: "spsurfrashguard",
    description: "Pacific-teal and white color-block UV surf rashguard swim top.",
    tags: ["surf", "athletic", "summer"],
    prompt:
      "Fitted long-sleeve neoprene and UV-lycra surf rashguard swim top in Pacific teal and white color-block panels with front zip. Isolated wardrobe piece spsurfrashguard.",
  },
  {
    id: "spskiparka",
    description: "Waterproof Gore-Tex alpine ski and snowboard shell jacket.",
    tags: ["ski", "athletic", "winter"],
    prompt:
      "Alpine waterproof Gore-Tex ski and snowboard shell jacket in信号-red and white with snow-gaiter hood, ski-pass sleeve pocket, and sealed zips. Isolated wardrobe piece spskiparka.",
  },
  {
    id: "spbaseballjersey",
    description: "Classic cream-and-navy pinstripe button-front baseball jersey.",
    tags: ["baseball", "athletic", "street"],
    prompt:
      "Classic cream-and-navy pinstripe button-front baseball jersey shirt with raglan sleeves and stitched chest lettering. Isolated wardrobe piece spbaseballjersey.",
  },
  {
    id: "spcompressiontop",
    description: "Matte carbon-black long-sleeve athletic compression base layer.",
    tags: ["running", "athletic"],
    prompt:
      "Matte carbon-black long-sleeve athletic compression base-layer training top with ergonomic flatlock silver seams. Isolated wardrobe piece spcompressiontop.",
  },
  {
    id: "sppickleballtank",
    description: "Color-block pickleball performance tank for court sports.",
    tags: ["pickleball", "tennis", "athletic", "summer"],
    prompt:
      "Bright coral-and-white color-block pickleball performance tank with a racerback mesh panel and UPF sun-protective stretch fabric. Isolated wardrobe piece sppickleballtank.",
  },
  {
    id: "sppeekaboodress",
    description: "Peek-A-Boo layered pickleball tennis dress with built-in shorts.",
    tags: ["pickleball", "tennis", "athletic", "summer"],
    prompt:
      "Sleek black athletic Peek-A-Boo pickleball tennis dress with a faux layered white under-tank, side slits that reveal built-in white compression shorts, and a fit-and-flare skirt hem. Isolated wardrobe piece sppeekaboodress.",
  },
  {
    id: "spclimbingtank",
    description: "Climbing and bouldering stretch tank.",
    tags: ["climbing", "athletic", "casual"],
    prompt:
      "Dusty terracotta stretch climbing tank with a scooped back, reinforced bust seam, and chalk-friendly matte fabric. Isolated wardrobe piece spclimbingtank.",
  },
  {
    id: "sppipedsportsbra",
    description: "Black performance sports bra with crisp white contrast piping (distilled from Alo & Vuori).",
    tags: ["yoga", "pilates", "athletic", "summer"],
    prompt:
      "Fitted matte-black technical jersey sports bra featuring delicate white contrast trim piping along the scoop neckline, shoulder straps, and supportive underband. Isolated wardrobe piece sppipedsportsbra.",
  },
  {
    id: "spmochaunitard",
    description: "Deep espresso-mocha sleeveless yoga and pilates unitard bodice (distilled from Alo Yoga).",
    tags: ["yoga", "pilates", "athletic"],
    prompt:
      "Deep chocolate-mocha sleeveless athletic unitard bodice with a clean scoop neckline, racerback cut, and smooth compressive seamless finish. Isolated wardrobe piece spmochaunitard.",
  },
  {
    id: "spscallopdress",
    description: "Scalloped-hem contrast-piped active court mini dress (distilled from Blogilates).",
    tags: ["pickleball", "tennis", "pilates", "athletic", "summer"],
    prompt:
      "Fitted powder-blue sleeveless active court mini dress featuring crisp white vertical contrast piping and a playful scalloped petal hemline over built-in shorts. Isolated wardrobe piece spscallopdress.",
  },
  {
    id: "spretrotrackjacket",
    description: "Cream and burgundy color-block retro tennis track jacket (distilled from Wilson).",
    tags: ["tennis", "pickleball", "athletic", "casual"],
    prompt:
      "Sporty cream off-white zip-up court track jacket featuring deep burgundy geometric color-blocked side panels, a high stand collar, and elasticated cuffs in crisp technical nylon. Isolated wardrobe piece spretrotrackjacket.",
  },
  {
    id: "spsunhoodie",
    description: "Slate-blue UPF technical climbing and trail sun hoodie (distilled from Black Diamond).",
    tags: ["climbing", "running", "athletic"],
    prompt:
      "Fitted slate-blue long-sleeve technical UPF sun hoodie in lightweight moisture-wicking stretch fabric with raglan sleeves and a low-profile under-helmet hood. Isolated wardrobe piece spsunhoodie.",
  },
];

export const SPORTS_PANTS: readonly CharacterLookOption[] = [
  {
    id: "sptennispleatskort",
    description: "Crisp white high-waisted pleated tennis skort with green piping.",
    tags: ["tennis", "pickleball", "athletic", "summer"],
    prompt:
      "Crisp white high-waisted pleated athletic tennis skort with built-in compression shorts and forest-green waistband piping. Isolated wardrobe piece sptennispleatskort.",
  },
  {
    id: "spbballmeshshorts",
    description: "Heavyweight gold-and-purple breathable mesh basketball shorts.",
    tags: ["basketball", "athletic", "street"],
    prompt:
      "Knee-length heavyweight gold-and-purple breathable mesh basketball shorts with striped knit waistband and side vents. Isolated wardrobe piece spbballmeshshorts.",
  },
  {
    id: "spsoccershorts",
    description: "White pitch football soccer shorts with red side stripes.",
    tags: ["soccer", "athletic"],
    prompt:
      "Athletic white football soccer pitch shorts with red side three-stripe detailing and an elastic drawstring waist. Isolated wardrobe piece spsoccershorts.",
  },
  {
    id: "sprunsplitshorts",
    description: "Featherweight black marathon split running shorts.",
    tags: ["running", "athletic", "summer"],
    prompt:
      "Featherweight black marathon split running shorts with an inner brief liner, reflective trim, and high side vents. Isolated wardrobe piece sprunsplitshorts.",
  },
  {
    id: "spyogaflarepants",
    description: "Espresso-brown crossover V-waist yoga and pilates flare pants.",
    tags: ["yoga", "pilates", "athletic", "casual"],
    prompt:
      "High-waisted espresso-brown buttery-soft stretch yoga and pilates flare leggings with a crossover V-waistband. Isolated wardrobe piece spyogaflarepants.",
  },
  {
    id: "spcyclingbibshorts",
    description: "Pro aerodynamic matte-black padded road cycling bib shorts.",
    tags: ["cycling", "athletic"],
    prompt:
      "Pro aerodynamic matte-black Lycra padded road cycling shorts with silicone leg grippers and subtle team stripe. Isolated wardrobe piece spcyclingbibshorts.",
  },
  {
    id: "spgolfpleatedskort",
    description: "Tailored navy-blue stretch-twill golf skort with box pleats.",
    tags: ["golf", "tennis", "pickleball", "athletic"],
    prompt:
      "Tailored navy-blue stretch-twill ladies golf skort with front box pleats and tee pocket detailing. Isolated wardrobe piece spgolfpleatedskort.",
  },
  {
    id: "spgolfchinos",
    description: "Stone-beige four-way-stretch tailored tour golf trousers.",
    tags: ["golf", "athletic", "casual", "formal"],
    prompt:
      "Tailored stone-beige technical four-way-stretch men's golf trousers with a crisp center crease and breathable weave. Isolated wardrobe piece spgolfchinos.",
  },
  {
    id: "spboxingsatinshorts",
    description: "Black-and-gold satin championship boxing ring trunks.",
    tags: ["boxing", "athletic"],
    prompt:
      "High-waisted black-and-gold satin championship boxing trunks with a wide elastic championship waistband and side slits. Isolated wardrobe piece spboxingsatinshorts.",
  },
  {
    id: "spsurfboardshorts",
    description: "Quick-dry Pacific-teal and coral striped surf boardshorts.",
    tags: ["surf", "athletic", "summer"],
    prompt:
      "Quick-dry Pacific-teal and sunset-coral striped surf boardshorts with a lace-up waistband and side zip pocket. Isolated wardrobe piece spsurfboardshorts.",
  },
  {
    id: "spskisnowpants",
    description: "Insulated waterproof alpine ski and snowboard bib trousers.",
    tags: ["ski", "athletic", "winter"],
    prompt:
      "Insulated waterproof white-and-black alpine ski and snowboard bib trousers with reinforced scuff guards and zip vents. Isolated wardrobe piece spskisnowpants.",
  },
  {
    id: "spcompressiontights",
    description: "Full-length matte-black running and gym compression tights.",
    tags: ["running", "athletic"],
    prompt:
      "Full-length matte black athletic running and gym compression tights with ergonomic knee paneling and ankle zips. Isolated wardrobe piece spcompressiontights.",
  },
  {
    id: "sppeekabooskort",
    description: "Peek-A-Boo pickleball skort with flowing skirt over built-in shorts.",
    tags: ["pickleball", "tennis", "athletic", "summer"],
    prompt:
      "Flowing coral athletic Peek-A-Boo pickleball skort with a 17-inch skirt layer, side vents that reveal matching built-in compression shorts, and deep side ball pockets. Isolated wardrobe piece sppeekabooskort.",
  },
  {
    id: "sppicklepleatskort",
    description: "Pleated pickleball court skort with ball pockets.",
    tags: ["pickleball", "tennis", "athletic"],
    prompt:
      "Crisp white high-waisted pleated pickleball court skort with navy waistband piping, built-in shorts, and dual side pockets sized for pickleballs. Isolated wardrobe piece sppicklepleatskort.",
  },
  {
    id: "spclimbingpants",
    description: "Stretch climbing pants with articulated knees.",
    tags: ["climbing", "athletic", "casual"],
    prompt:
      "Olive stretch climbing pants with articulated knees, a gusseted crotch, tapered ankles, and brushed softshell panels. Isolated wardrobe piece spclimbingpants.",
  },
  {
    id: "sptaupeleggings",
    description: "High-waisted seamless taupe beige yoga leggings (distilled from Alo Yoga).",
    tags: ["yoga", "pilates", "athletic", "lounge"],
    prompt:
      "High-waisted warm taupe-beige compression yoga leggings tailored in smooth matte seamless performance fabric with a sculpted waistband. Isolated wardrobe piece sptaupeleggings.",
  },
  {
    id: "sppinkbikeshorts",
    description: "Bubblegum-pink compressive pilates and studio bike shorts (distilled from Blogilates).",
    tags: ["pilates", "yoga", "athletic", "summer"],
    prompt:
      "High-waisted bubblegum-pink fitted athletic biker shorts with flatlock sculpting seams in a compressive stretch performance knit. Isolated wardrobe piece sppinkbikeshorts.",
  },
  {
    id: "spwidelegtrack",
    description: "Relaxed wide-leg cream court warm-up track pants with burgundy accents (distilled from Wilson).",
    tags: ["tennis", "pickleball", "athletic", "casual"],
    prompt:
      "Relaxed wide-leg cream court track pants crafted from crisp technical fabric with tonal side stripes and deep burgundy contrast accents at the hip. Isolated wardrobe piece spwidelegtrack.",
  },
  {
    id: "spclimbshorts",
    description: "Slate-grey stretch rock-climbing shorts cut above the knee (distilled from Black Diamond).",
    tags: ["climbing", "athletic", "summer"],
    prompt:
      "Slate-grey technical rock-climbing shorts cut above the knee from durable four-way stretch nylon with a flat harness-compatible elastic waistband. Isolated wardrobe piece spclimbshorts.",
  },
];

export const SPORTS_SHOES: readonly CharacterLookOption[] = [
  {
    id: "spcarbonmarathonz",
    description: "Neon volt-lime carbon-plated marathon racing running shoes.",
    tags: ["running", "athletic"],
    prompt:
      "Neon volt-lime and white carbon-plated marathon racing running shoes with an ultra-thick sculpted ZoomX foam midsole. Isolated wardrobe piece spcarbonmarathonz.",
  },
  {
    id: "spbballhightop",
    description: "Bred black, red, and white leather high-top basketball sneakers.",
    tags: ["basketball", "athletic", "street"],
    prompt:
      "Signature championship high-top basketball sneakers in bred black, varsity red, and white leather with visible air cushioning. Isolated wardrobe piece spbballhightop.",
  },
  {
    id: "spsoccercleats",
    description: "Silver and electric-blue firm-ground football soccer cleats.",
    tags: ["soccer", "athletic"],
    prompt:
      "Metallic silver and electric-blue firm-ground football soccer cleats with a knitted sock collar and molded pitch studs. Isolated wardrobe piece spsoccercleats.",
  },
  {
    id: "sptenniscourt",
    description: "Crisp white and forest-green all-court pro tennis shoes.",
    tags: ["tennis", "pickleball", "athletic"],
    prompt:
      "All-court pro tennis shoes in crisp white leather and breathable mesh with herringbone clay-and-hardcourt outsole and green accents. Isolated wardrobe piece sptenniscourt.",
  },
  {
    id: "spgolfspikeless",
    description: "White-and-tan saddle leather spikeless golf shoes with kiltie fringe.",
    tags: ["golf", "athletic"],
    prompt:
      "Classic white-and-tan saddle leather spikeless golf shoes with kiltie fringe detail and turf-grip dimpled outsole. Isolated wardrobe piece spgolfspikeless.",
  },
  {
    id: "spcyclingcleats",
    description: "Matte-white carbon-sole road cycling shoes with dual BOA dials.",
    tags: ["cycling", "athletic"],
    prompt:
      "Sleek matte-white carbon-sole road cycling shoes with dual BOA dial wire closures and aerodynamic perforations. Isolated wardrobe piece spcyclingcleats.",
  },
  {
    id: "spboxingboots",
    description: "High-top black-and-gold lace-up championship boxing ring boots.",
    tags: ["boxing", "athletic"],
    prompt:
      "High-top black-and-gold lace-up championship boxing ring boots with breathable mesh panels and thin pivot rubber soles. Isolated wardrobe piece spboxingboots.",
  },
  {
    id: "sppilatesgripsocks",
    description: "Cream ribbed crew pilates and yoga barre socks with crossover straps.",
    tags: ["pilates", "yoga", "athletic", "lounge"],
    prompt:
      "Cream ribbed organic-cotton crew pilates and yoga barre socks with ballet-style crossover elastic straps and silicone grip soles. Isolated wardrobe piece sppilatesgripsocks.",
  },
  {
    id: "sptrailrunners",
    description: "Earth-olive and burnt-orange Gore-Tex Vibram lug trail running shoes.",
    tags: ["running", "climbing", "athletic"],
    prompt:
      "Rugged earth-olive and burnt-orange Gore-Tex trail running shoes with aggressive Vibram lugged soles and quick-lace system. Isolated wardrobe piece sptrailrunners.",
  },
  {
    id: "spsnowboardboots",
    description: "Charcoal and neon-orange BOA dial alpine snowboard and ski boots.",
    tags: ["ski", "athletic", "winter"],
    prompt:
      "Chunky alpine ski and snowboard boots in matte charcoal and neon orange with BOA dial lacing and thermal liner. Isolated wardrobe piece spsnowboardboots.",
  },
  {
    id: "spliftingflat",
    description: "Gum-sole canvas and black suede wedge-heel powerlifting shoes.",
    tags: ["athletic"],
    prompt:
      "Powerlifting and gym training shoes in gum-sole canvas and black suede with a raised wooden heel wedge and midfoot strap. Isolated wardrobe piece spliftingflat.",
  },
  {
    id: "spbadmintoncourt",
    description: "White and royal-blue gum-sole indoor badminton and volleyball court shoes.",
    tags: ["tennis", "pickleball", "athletic"],
    prompt:
      "Lightweight indoor badminton and volleyball court shoes in white and royal blue with non-marking gum rubber hex-grip soles. Isolated wardrobe piece spbadmintoncourt.",
  },
  {
    id: "sppicklecourt",
    description: "Court shoes for pickleball and tennis with lateral support.",
    tags: ["pickleball", "tennis", "athletic"],
    prompt:
      "White and neon-lime outdoor pickleball court shoes with wide lateral stability straps, durable herringbone outsoles, and breathable mesh uppers. Isolated wardrobe piece sppicklecourt.",
  },
  {
    id: "spclimbingshoe",
    description: "Aggressive downturned climbing shoes.",
    tags: ["climbing", "athletic"],
    prompt:
      "Bright orange downturned climbing shoes with sticky rubber rands, a snug ballet-like closure, and a pointed toe box. Isolated wardrobe piece spclimbingshoe.",
  },
  {
    id: "spcolorblockcourt",
    description: "Neon color-block pro pickleball court sneakers (distilled from Pickleball Central).",
    tags: ["pickleball", "tennis", "athletic"],
    prompt:
      "Performance pickleball court sneakers in breathable black mesh with striking neon hot-pink, cyan-blue, and orange stability overlays and multi-traction court rubber soles. Isolated wardrobe piece spcolorblockcourt.",
  },
  {
    id: "spsilvermeshrunner",
    description: "Metallic-silver and grey mesh retro running sneakers (distilled from Vuori).",
    tags: ["running", "athletic", "casual", "street"],
    prompt:
      "Chunky retro running sneakers in metallic silver, heather grey, and white breathable mesh panels with segmented cloud-cushion midsoles and ribbed white crew socks. Isolated wardrobe piece spsilvermeshrunner.",
  },
  {
    id: "sprufflesocksneak",
    description: "Retro suede studio sneakers paired with lettuce-edge ruffled crew socks (distilled from Blogilates).",
    tags: ["pilates", "yoga", "casual", "athletic"],
    prompt:
      "Low-top off-white and warm sand suede retro sneakers on gum soles styled with white ribbed cotton crew socks featuring a delicate lettuce-edge ruffled cuff. Isolated wardrobe piece sprufflesocksneak.",
  },
];

export const SPORTS_ACCESSORIES: readonly CharacterLookOption[] = [
  {
    id: "sptennisvisor",
    description: "Crisp white athletic tennis sun visor cap with terry wristbands.",
    tags: ["tennis", "pickleball", "athletic", "summer"],
    prompt:
      "Crisp white athletic tennis sun visor cap paired with matching terry-cloth wrist sweatbands. Isolated wardrobe piece sptennisvisor.",
  },
  {
    id: "spboxinggloves",
    description: "Glossy black-and-gold 12oz championship leather boxing gloves.",
    tags: ["boxing", "athletic"],
    prompt:
      "Pair of championship 12oz leather boxing gloves in glossy black and gold hung across the shoulders. Isolated wardrobe piece spboxinggloves.",
  },
  {
    id: "spcyclinghelmet",
    description: "Matte-white aerodynamic road cycling helmet with wrap sunglasses.",
    tags: ["cycling", "athletic"],
    prompt:
      "Aerodynamic matte-white road cycling helmet paired with iridescent polarized wrap-around cycling sunglasses. Isolated wardrobe piece spcyclinghelmet.",
  },
  {
    id: "spskogoggles",
    description: "Frameless mirrored alpine ski goggles on a knit winter beanie.",
    tags: ["ski", "athletic", "winter"],
    prompt:
      "Frameless mirrored-lens alpine ski and snowboard goggles resting on a warm knit winter helmet beanie. Isolated wardrobe piece spskogoggles.",
  },
  {
    id: "spyogamatstrap",
    description: "Rolled sage-green yoga mat carried on a woven shoulder sling.",
    tags: ["yoga", "pilates", "athletic"],
    prompt:
      "Rolled sage-green natural rubber yoga mat carried on a woven canvas shoulder sling strap. Isolated wardrobe piece spyogamatstrap.",
  },
  {
    id: "sprunningvest",
    description: "Ultralight marathon trail-running hydration vest with dual soft flasks.",
    tags: ["running", "climbing", "athletic"],
    prompt:
      "Ultralight marathon trail-running hydration vest pack with dual soft-flask water bottles on the chest straps. Isolated wardrobe piece sprunningvest.",
  },
  {
    id: "sppicklepaddle",
    description: "Pickleball paddle carried as a court accessory.",
    tags: ["pickleball", "athletic", "summer"],
    prompt:
      "Graphite-faced neon pickleball paddle held casually at the side with a matching wrist leash cord. Isolated wardrobe piece sppicklepaddle.",
  },
  {
    id: "spclimbingchalkbag",
    description: "Climbing chalk bag worn at the waist.",
    tags: ["climbing", "athletic"],
    prompt:
      "Compact chalk bag in dusty teal corduroy worn on a webbing waist belt with a drawstring closure. Isolated wardrobe piece spclimbingchalkbag.",
  },
  {
    id: "spclimbhelmet",
    description: "Bright red lightweight ventilated climbing helmet (distilled from Black Diamond).",
    tags: ["climbing", "athletic"],
    prompt:
      "Bright red lightweight polycarbonate rock-climbing helmet with integrated side ventilation slots and an adjustable webbing chin strap. Isolated wardrobe piece spclimbhelmet.",
  },
  {
    id: "spclimbharness",
    description: "Technical rock-climbing waist harness with carabiners (distilled from Black Diamond).",
    tags: ["climbing", "athletic"],
    prompt:
      "Low-profile matte-black and charcoal rock-climbing waist harness with padded leg loops and racked anodized carabiners on the side gear loops. Isolated wardrobe piece spclimbharness.",
  },
  {
    id: "sptennistote",
    description: "Striped heavy canvas court tote bag with tennis racket pocket (distilled from Wilson).",
    tags: ["tennis", "pickleball", "athletic", "casual"],
    prompt:
      "Structured cream-and-forest-green horizontal striped heavy cotton canvas court tote bag with a dedicated front pocket holding a tennis or pickleball racket. Isolated wardrobe piece sptennistote.",
  },
  {
    id: "spvisorandshades",
    description: "Performance court visor paired with tinted wrap sport sunglasses (distilled from Pickleball Central).",
    tags: ["pickleball", "tennis", "running", "athletic", "summer"],
    prompt:
      "Navy performance open-crown court sun visor paired with sleek dark-tinted wraparound sports sunglasses and matching wrist sweatbands. Isolated wardrobe piece spvisorandshades.",
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
    sppickleballtank: "Pickleball Color-Block Tank",
    sppeekaboodress: "Peek-A-Boo Court Dress",
    spclimbingtank: "Climbing Stretch Tank",
    sppipedsportsbra: "Contrast-Piped Sports Bra",
    spmochaunitard: "Mocha Studio Unitard Top",
    spscallopdress: "Scalloped Petal Court Dress",
    spretrotrackjacket: "Color-Block Court Track Jacket",
    spsunhoodie: "UPF Technical Sun Hoodie",
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
    sppeekabooskort: "Peek-A-Boo Pickleball Skort",
    sppicklepleatskort: "Pleated Pickleball Skort",
    spclimbingpants: "Articulated Climbing Pants",
    sptaupeleggings: "Seamless Taupe Yoga Leggings",
    sppinkbikeshorts: "Pink Studio Bike Shorts",
    spwidelegtrack: "Wide-Leg Court Track Pants",
    spclimbshorts: "Stretch Rock-Climbing Shorts",
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
    sppicklecourt: "Pickleball Court Shoes",
    spclimbingshoe: "Downturned Climbing Shoes",
    spcolorblockcourt: "Color-Block Pro Pickleball Shoes",
    spsilvermeshrunner: "Silver Mesh Retro Runners",
    sprufflesocksneak: "Ruffle-Sock Studio Sneakers",
  },
  accessory: {
    sptennisvisor: "Tennis Sun Visor & Wristbands",
    spboxinggloves: "Pro Leather Boxing Gloves",
    spcyclinghelmet: "Aero Cycling Helmet & Shades",
    spskogoggles: "Mirrored Alpine Ski Goggles",
    spyogamatstrap: "Rolled Yoga Mat & Sling",
    sprunningvest: "Marathon Hydration Vest",
    sppicklepaddle: "Pickleball Paddle",
    spclimbingchalkbag: "Climbing Chalk Bag",
    spclimbhelmet: "Ventilated Climbing Helmet",
    spclimbharness: "Climbing Harness & Carabiners",
    sptennistote: "Striped Canvas Court Tote",
    spvisorandshades: "Court Visor & Wrap Shades",
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
    sppickleballtank: "撞色匹克球運動背心",
    sppeekaboodress: "Peek-A-Boo 分層球場連身裙",
    spclimbingtank: "攀岩彈性運動背心",
    sppipedsportsbra: "黑白滾邊運動內衣",
    spmochaunitard: "摩卡色連身瑜珈背心",
    spscallopdress: "花瓣下擺滾邊球場短洋裝",
    spretrotrackjacket: "復古拼色球場拉鍊夾克",
    spsunhoodie: "灰藍機能防曬攀岩連帽衣",
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
    sppeekabooskort: "Peek-A-Boo 匹克球短裙褲",
    sppicklepleatskort: "百褶匹克球場短裙",
    spclimbingpants: "立體剪裁攀岩長褲",
    sptaupeleggings: "裸色無縫高腰瑜珈緊身褲",
    sppinkbikeshorts: "亮粉色高腰普拉提單車短褲",
    spwidelegtrack: "米白拼酒紅闊腿熱身運動褲",
    spclimbshorts: "灰藍四面彈力攀岩短褲",
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
    sppicklecourt: "匹克球室外場地鞋",
    spclimbingshoe: "下彎攀岩鞋",
    spcolorblockcourt: "霓虹撞色專業匹克球鞋",
    spsilvermeshrunner: "銀灰網布復古緩震跑鞋",
    sprufflesocksneak: "木耳邊中筒襪配復古麂皮球鞋",
  },
  accessory: {
    sptennisvisor: "網球遮陽空頂帽配護腕",
    spboxinggloves: "黑金真皮專業拳擊手套",
    spcyclinghelmet: "破風單車頭盔配偏光風鏡",
    spskogoggles: "無框炫彩鍍膜滑雪護目鏡",
    spyogamatstrap: "鼠尾草綠背帶瑜珈墊",
    sprunningvest: "越野馬拉松雙水壺補給背心",
    sppicklepaddle: "匹克球拍",
    spclimbingchalkbag: "攀岩粉袋",
    spclimbhelmet: "亮紅輕量透氣攀岩頭盔",
    spclimbharness: "專業攀岩安全吊帶與快扣",
    sptennistote: "條紋帆布球拍托特包",
    spvisorandshades: "深藍遮陽帽配運動風鏡",
  },
} as const;
