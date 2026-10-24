// Extra wardrobe picks. Prompts stay unique inside each part so detection can match them exactly.
import type { CharacterLookOption } from "@/service/character/character-look";
import { AMENDA_PANTS, AMENDA_TOPS } from "@/service/character/amenda-wardrobe";
import {
  BRANDING_ACCESSORIES,
  BRANDING_HAIR,
  BRANDING_PANTS,
  BRANDING_SHOES,
  BRANDING_TOPS,
} from "@/service/character/branding-styling-wardrobe";
import {
  CASUAL_ACCESSORIES,
  CASUAL_HAIR,
  CASUAL_PANTS,
  CASUAL_SHOES,
  CASUAL_TOPS,
} from "@/service/character/casual-wardrobe";
import {
  SPORTS_ACCESSORIES,
  SPORTS_PANTS,
  SPORTS_SHOES,
  SPORTS_TOPS,
} from "@/service/character/sports-wardrobe";

const HERITAGE_HAIR: readonly CharacterLookOption[] = [
  { id: "dreadlocks", prompt: "shoulder-length natural dreadlocks parted in the center and falling cleanly around the shoulders" },
  { id: "cornrows", prompt: "neat scalp-braided cornrows running straight back from the forehead to the nape" },
  { id: "bantu", prompt: "sculptural parted Bantu knots arranged symmetrically across the crown of the head" },
  { id: "spacebuns", prompt: "two high symmetrical double space buns on the top of the head with wispy face-framing strands" },
];

const STYLIZED_HAIR: readonly CharacterLookOption[] = [
  { id: "pompadour", prompt: "a classic rockabilly swept-back high-volume pompadour with clean tapered sides" },
  { id: "curtain", prompt: "90s heartthrob center-parted medium-length curtain bangs flowing past the cheekbones" },
  { id: "shag", prompt: "1970s rock-and-roll textured layered shag haircut with choppy fringe and tousled volume" },
  { id: "buzzfade", prompt: "ultra-clean barbershop skin-fade buzzcut with a razor-sharp hairline" },
];

const CLASSIC_HAIR: readonly CharacterLookOption[] = [
  { id: "pixie", prompt: "a chic gamine short tapered pixie cut with soft textured layers on top and exposed ears" },
  { id: "ponytail", prompt: "a sleek high ponytail pulled taut at the crown with a smooth wrap around the base" },
  { id: "frenchtwist", prompt: "an elegant vertical French twist updo pinned neatly along the back of the head" },
  { id: "beachwaves", prompt: "effortless collar-length sun-kissed beach waves with a relaxed side part" },
  { id: "slickback", prompt: "wet-look editorial slicked-back hair combed smoothly straight back from the forehead" },
  { id: "sidepart", prompt: "a classic gentleman's side-parted tapered haircut with a neat combed finish" },
  ...BRANDING_HAIR,
  ...CASUAL_HAIR,
];

const HERITAGE_TOPS: readonly CharacterLookOption[] = [
  { id: "qipaotop", prompt: "a hip-length silk qipao cheongsam top in blush floral jacquard, with a high mandarin collar and diagonal frog buttons" },
  { id: "jeogori", prompt: "a Korean hanbok jeogori, a short cropped wrap jacket in pale pink silk with wide sleeves and a long ribbon goreum tie" },
  { id: "durumagi", prompt: "a Korean durumagi overcoat in celadon silk, straight and long, with a high collar and wide sleeves" },
  { id: "kimono", prompt: "a Japanese kimono wrap top in indigo silk patterned with small white asanoha hemp leaves, crossed left over right" },
  { id: "haori", prompt: "a Japanese haori short coat worn open, black silk, with a single white family crest on the left chest" },
  { id: "yukata", prompt: "a summer cotton yukata wrap top on a white ground printed with indigo seigaiha waves" },
  { id: "cholisari", prompt: "a fitted short-sleeve maroon silk choli blouse with a gold-bordered sari pallu draped over the left shoulder" },
  { id: "kurta", prompt: "a straight white cotton kurta tunic with a mandarin collar, a short button placket, and side slits at the hem" },
  { id: "dashiki", prompt: "a loose West African dashiki tunic in deep green cotton with a wide gold-embroidered neckline" },
  { id: "agbada", prompt: "a flowing Nigerian agbada robe in cream with a large gold-embroidered chest panel and very wide sleeves" },
  { id: "boubou", prompt: "a loose West African boubou tunic in indigo cotton with white geometric stitching around the neck opening" },
  { id: "kente", prompt: "a Ghanaian kente wrap top made of narrow woven strips in gold, green, red, and black" },
  { id: "kanga", prompt: "an East African kanga wrap top in bright cotton, with a thick printed border and a plain center field" },
  { id: "shuka", prompt: "a Maasai shuka cloth in red plaid with black and blue lines, draped over one shoulder and across the chest" },
  { id: "huipil", prompt: "a square-cut Mexican huipil blouse in white handwoven cotton with a dense geometric brocade yoke" },
  { id: "ternotop", prompt: "a Filipino terno blouse in ivory piña with stiff butterfly sleeves standing out from both shoulders" },
  { id: "ruana", prompt: "an Andean ruana open-front wool poncho in charcoal with a single thin crimson stripe" },
  { id: "sarape", prompt: "a Mexican sarape poncho with bold horizontal stripes in cream, rust, indigo, and black" },
  { id: "galabeya", prompt: "an Egyptian galabeya tunic in pale blue cotton, loose through the body, with a plain round neck" },
  { id: "kaftan", prompt: "a Moroccan kaftan in emerald silk with narrow gold braid edging the round neck and the cuffs" },
  { id: "djellaba", prompt: "a Moroccan djellaba in oatmeal wool with a pointed hood resting on the back and a long front slit" },
  { id: "thobe", prompt: "a Gulf thobe in crisp white cotton with a stand collar and a narrow buttoned placket" },
  { id: "bisht", prompt: "a black wool bisht cloak worn open, with gold cord embroidery running down both front edges" },
  { id: "vyshyvanka", prompt: "a Ukrainian vyshyvanka shirt in white linen with red and black geometric embroidery down the center placket" },
  { id: "dirndlblouse", prompt: "a Bavarian dirndl blouse in white cotton with short puffed sleeves and a low square neckline" },
  { id: "gakti", prompt: "a Sámi gákti tunic in deep blue wool with red and yellow woven bands at the collar, cuffs, and hem" },
  { id: "inuitparka", prompt: "an Arctic parka in cream canvas with a fur ruff around the hood and a long brass front zipper" },
  { id: "changshan", prompt: "a Chinese changshan long jacket in charcoal silk with a mandarin collar, knot buttons, and side vents" },
  { id: "kebaya", prompt: "an Indonesian kebaya in semi-sheer ivory cotton, fitted at the waist, with a deep V closed by a small brooch" },
  { id: "bajukurung", prompt: "a Malay baju kurung long tunic in dusty rose silk, loose and straight, with a round neckline" },
  { id: "nyonyakebaya", prompt: "a Peranakan nyonya kebaya in turquoise floral lace, semi-sheer, fastened at the chest with a gold brooch" },
  { id: "aobaba", prompt: "a Vietnamese áo bà ba tunic in black silk, hip length, with a stand collar and side frog buttons" },
  { id: "sabai", prompt: "a Thai sabai of gold silk draped diagonally from the right shoulder across the chest over a plain strapless band" },
  { id: "deel", prompt: "a Mongolian deel wrap robe in deep red silk with a high collar, an overlapping front, and a wide cloth sash" },
  { id: "chuba", prompt: "a Tibetan chuba wrap coat in burgundy wool with long sleeves and a gold lining turned back at each cuff" },
  { id: "gho", prompt: "a Bhutanese gho in muted brown plaid wool, a knee-length wrap folded into a pouch above a narrow belt" },
  { id: "hanfuru", prompt: "a Chinese hanfu ru crossover top in ivory silk with very wide rectangular sleeves" },
  { id: "zhongshan", prompt: "a Zhongshan suit jacket in olive wool with a stand collar, five front buttons, and four flapped patch pockets" },
  { id: "sukajan", prompt: "a Japanese sukajan souvenir jacket in cream satin with a dragon embroidered on the left chest and ribbed cuffs" },
  { id: "happi", prompt: "a short Japanese happi festival coat in indigo cotton with one large white crest printed on the chest" },
  { id: "jinbei", prompt: "a Japanese jinbei wrap top in navy cotton with short sleeves and a side tie" },
  { id: "montsuki", prompt: "a formal black silk montsuki kimono jacket with small white family crests on the chest and both sleeves" },
  { id: "bunad", prompt: "a Norwegian bunad jacket in black wool with a vertical row of silver buttons and red embroidery at the cuffs" },
  { id: "aran", prompt: "an Irish Aran fisherman sweater in cream wool with cable, diamond, and basketweave knit panels" },
  { id: "phulkari", prompt: "a Punjabi phulkari kurta in mustard cotton covered in dense multicolor silk floral embroidery" },
  { id: "abaya", prompt: "a long black abaya in matte crepe, open down the front, with narrow sleeves" },
  { id: "chamanto", prompt: "a Chilean huaso chamanto, a short poncho in a tight black-and-white geometric weave with a short fringe" },
  { id: "kosovorotka", prompt: "a Russian kosovorotka shirt in white linen with an asymmetric side collar and a band of red embroidery" },
];

const STYLIZED_TOPS: readonly CharacterLookOption[] = [
  { id: "carcoat", prompt: "a 2020s hip-length wool car coat in camel with a notched lapel and a single button" },
  { id: "peplum", prompt: "a structured peplum jacket in black wool with a short flared flounce at the waist" },
  { id: "boule", prompt: "a rounded boule jacket in ivory wool with balloon sleeves and a cropped hem" },
  { id: "floralwrap", prompt: "a silk wrap blouse with a deep V and a large coral-and-cream floral print" },
  { id: "secondskin", prompt: "a fine-gauge second-skin long-sleeve knit in solid black with no collar" },
  { id: "bouclecoat", prompt: "a boxy coat in ivory bouclé with a high round neck and no lapels" },
  { id: "bomber", prompt: "an olive nylon bomber jacket with a ribbed collar, ribbed cuffs, and a zip front" },
  { id: "flannel", prompt: "an open 1990s grunge overshirt in red-and-black buffalo-check flannel" },
  { id: "modjacket", prompt: "a 1960s Mod collarless jacket in navy with a slim zip front" },
  { id: "discoshirt", prompt: "a 1970s champagne satin disco shirt with a wide pointed collar, open at the throat" },
  { id: "newwave", prompt: "a 1980s black new-wave shirt with sharp extended shoulder pads and a narrow collar" },
  { id: "babytee", prompt: "a 2000s Y2K pale-pink ribbed baby tee, cropped to end above the waist" },
  { id: "hawaiian", prompt: "a short-sleeve Hawaiian shirt in navy rayon printed with white palm trees" },
  { id: "westernshirt", prompt: "a western snap shirt in mid-blue denim with pointed yokes and pearl snap buttons" },
  { id: "sailor", prompt: "a navy sailor top with a wide square collar outlined by two white stripes" },
  { id: "cape", prompt: "a sleeveless camel wool cape coat with arm slits, closed by one button at the neck" },
  { id: "smoking", prompt: "a burgundy velvet smoking jacket with black satin shawl lapels" },
  { id: "rugby", prompt: "a long-sleeve rugby shirt with a white collar and wide horizontal stripes in navy and red" },
  { id: "skisweater", prompt: "a 1970s color-block ski sweater in red, white, and navy with a short zip at the neck" },
  { id: "utilityvest", prompt: "a khaki photographer utility vest covered in flap pockets, shown with no shirt under it" },
  { id: "punkvest", prompt: "a black denim vest with a row of silver studs along both lapels" },
  { id: "windshirt", prompt: "a cropped matte-grey technical wind shirt with articulated seams and a short zip placket" },
  { id: "puffer", prompt: "a glossy cropped down puffer jacket with high-volume quilted baffles and a stand collar" },
  { id: "corsettop", prompt: "a structured architectural satin bustier corset top with boning seams and a square neckline" },
  { id: "varsitycardigan", prompt: "an oversized collegiate preppy cable-knit varsity cardigan with contrast sleeve stripes" },
  { id: "meshlayer", prompt: "a Y2K streetwear long-sleeve graphic mesh top layered under a matte black utility vest" },
  { id: "motojacket", prompt: "a color-blocked racing moto leather jacket with mandarin snap collar and padded shoulders" },
  ...SPORTS_TOPS,
];

const CLASSIC_TOPS: readonly CharacterLookOption[] = [
  { id: "oxford", prompt: "a white oxford-cloth button-down shirt, fully buttoned, with a soft button-down collar" },
  { id: "polo", prompt: "a navy piqué polo shirt with a two-button placket and a ribbed collar" },
  { id: "cardigan", prompt: "a camel merino V-neck cardigan, fully buttoned, with ribbed cuffs" },
  { id: "turtleneck", prompt: "a black fine-gauge turtleneck sweater with a close folded neck" },
  { id: "denimjacket", prompt: "a medium-wash denim trucker jacket with copper buttons and two chest pockets" },
  { id: "trench", prompt: "a beige cotton-gabardine trench coat, double-breasted, belted, falling to the knee" },
  { id: "peacoat", prompt: "a navy wool peacoat, double-breasted, with wide lapels and a short hem at the hip" },
  { id: "waistcoat", prompt: "a tailored grey wool waistcoat with five buttons and a deep V, worn with no jacket over it" },
  { id: "blouse", prompt: "an ivory silk blouse with a soft pussy-bow tied at the neck" },
  { id: "henley", prompt: "a heather-grey long-sleeve henley with a three-button placket and no collar" },
  { id: "chorecoat", prompt: "an ecru cotton chore coat with a point collar and four large patch pockets" },
  { id: "fleece", prompt: "a heather-grey half-zip fleece pullover with a stand collar" },
  { id: "campcollar", prompt: "a short-sleeve camp-collar shirt in sage linen, worn open at the neck" },
  { id: "overshirt", prompt: "a brown herringbone wool overshirt with a point collar and a button front" },
  { id: "crewneck", prompt: "a burgundy cotton crewneck sweater with ribbed hem and cuffs" },
  { id: "shacket", prompt: "a brown-and-cream checked wool shirt-jacket, hip length, with a button front" },
  { id: "windbreaker", prompt: "a lightweight navy windbreaker with a stand collar and an elasticated hem" },
  { id: "linenshirt", prompt: "a relaxed white linen shirt with the sleeves rolled once and the collar open" },
  { id: "tank", prompt: "a white ribbed tank top with a high round neck and wide armholes" },
  { id: "camisole", prompt: "a black silk camisole with thin spaghetti straps and a straight neckline" },
  { id: "silkshirt", prompt: "a fluid champagne silk button-down dress shirt with a relaxed open collar" },
  { id: "cashmerecrew", prompt: "a soft oatmeal cashmere crewneck sweater with fine ribbed trim" },
  { id: "haltertop", prompt: "a sleek minimalist black knit halter-neck top with clean tailored lines" },
  { id: "safarijacket", prompt: "an olive cotton cuatro-pocket belted safari field jacket" },
  ...AMENDA_TOPS,
  ...BRANDING_TOPS,
  ...CASUAL_TOPS,
];

const HERITAGE_PANTS: readonly CharacterLookOption[] = [
  { id: "kilt", prompt: "a Scottish tartan kilt in red and forest green, knee length, with sharp pressed pleats" },
  { id: "dhoti", prompt: "an Indian dhoti of unstitched white cotton, wrapped at the waist and pleated between the legs" },
  { id: "lungi", prompt: "a South Indian lungi, a tubular cotton wrap in blue-and-white checks, falling to the ankle" },
  { id: "lehenga", prompt: "an Indian lehenga skirt in maroon silk, fully flared, with a wide gold border at the hem" },
  { id: "chima", prompt: "a Korean hanbok chima, a high-waisted very full skirt in pale blue silk" },
  { id: "pollera", prompt: "an Andean pollera, a full gathered wool skirt in bright orange with a ribbon trim at the hem" },
  { id: "salvar", prompt: "Turkish salvar trousers in black cotton, very full through the hip and cinched tight at each ankle" },
  { id: "sareedrape", prompt: "a sari wrapped as a lower garment, deep green silk with a gold border, pleated down the front" },
  { id: "sampot", prompt: "a Cambodian sampot silk wrap in gold and green, folded into a panel at the front" },
  { id: "longyi", prompt: "a Myanmar longyi, a tubular cotton wrap in a muted brown plaid, falling to the ankle" },
  { id: "kikoi", prompt: "an East African kikoi wrap in bright horizontal stripes of turquoise, yellow, and white" },
  { id: "fustanella", prompt: "a Greek fustanella of many narrow white pleats, stiff and ending at the knee" },
  { id: "patiala", prompt: "Patiala salwar trousers in fuchsia cotton, extremely voluminous, gathered into cuffs at the ankle" },
  { id: "malong", prompt: "a Philippine malong tube wrap in a bright geometric weave of red, yellow, and black, worn to the ankle" },
  { id: "sarong", prompt: "a batik sarong in brown and cream, wrapped to the knee with an overlap at the front" },
  { id: "harem", prompt: "sand linen harem pants, full through the thigh and gathered into a cuff above each ankle" },
];

const STYLIZED_PANTS: readonly CharacterLookOption[] = [
  { id: "culottes", prompt: "wide-leg culottes in black wool, cropped to mid-calf, with a sharp front crease" },
  { id: "palazzo", prompt: "fluid palazzo trousers in champagne satin, very wide from the hip to the floor" },
  { id: "jodhpurs", prompt: "tan riding jodhpurs, full at the thigh and tight from the knee down" },
  { id: "breeches", prompt: "knee-length riding breeches in brown wool with a buckle tab below each knee" },
  { id: "trackpants", prompt: "tapered track pants in black with a white stripe down the outer seam and elastic cuffs" },
  { id: "corduroy", prompt: "rust wide-wale corduroy trousers with a straight leg" },
  { id: "bloomers", prompt: "1920s black satin bloomers, very full, gathered just below the knee" },
  { id: "plusfours", prompt: "1930s plus fours in olive tweed, baggy and ending four inches below the knee" },
  { id: "parachute", prompt: "1990s parachute pants in shiny black nylon with elastic cuffs and zip pockets" },
  { id: "carpenter", prompt: "carpenter jeans in dark denim with a hammer loop and a utility pocket on one thigh" },
  { id: "skinnyjeans", prompt: "black skinny jeans that hug the leg from hip to ankle" },
  { id: "paperbag", prompt: "high-waisted paperbag trousers in beige with a gathered waist and a self-fabric tie belt" },
  { id: "sailorpants", prompt: "navy sailor trousers with a flared leg and a buttoned front flap" },
  { id: "bikershorts", prompt: "matte black bike shorts ending at mid-thigh" },
  { id: "leatherpants", prompt: "sleek straight-leg black nappa leather trousers with knee seam detailing" },
  { id: "cargoskirt", prompt: "a utilitarian Y2K olive cotton midi cargo skirt with side flap pockets and a drawstring waist" },
  { id: "metallicpants", prompt: "futuristic brushed-silver metallic straight-cut streetwear trousers" },
  { id: "distresseddenim", prompt: "vintage light-wash relaxed denim jeans with artistic sashiko patchwork repairs" },
  ...SPORTS_PANTS,
];

const CLASSIC_PANTS: readonly CharacterLookOption[] = [
  { id: "pencilskirt", prompt: "a black pencil skirt, straight through the hip, with a short back vent" },
  { id: "pleatedmidi", prompt: "a navy pleated midi skirt falling to mid-calf" },
  { id: "maxiskirt", prompt: "a flowing ivory maxi skirt with a soft A-line to the floor" },
  { id: "denimskirt", prompt: "a mid-blue denim A-line skirt with a hem just above the knee" },
  { id: "tennisskirt", prompt: "a white tennis skirt with sharp knife pleats ending high on the thigh" },
  { id: "wrapskirt", prompt: "a rust linen wrap skirt overlapping at the front and stopping at the knee" },
  { id: "greytrousers", prompt: "flat-front grey wool trousers with a straight leg and a pressed crease" },
  { id: "croppedtrouser", prompt: "cropped trousers in black, ending above the ankle bone, with a narrow leg" },
  { id: "linenpants", prompt: "relaxed oatmeal linen trousers with a drawstring waist and a straight leg" },
  { id: "dressshorts", prompt: "tailored dress shorts in stone cotton with a crease, cut to end on the thigh" },
  { id: "wooltrousers", prompt: "charcoal flannel trousers with a straight leg and turn-ups at the hem" },
  { id: "joggers", prompt: "tapered joggers in dark navy French terry with ribbed cuffs" },
  { id: "momjeans", prompt: "high-waisted medium-wash mom jeans with a relaxed thigh and a tapered ankle" },
  { id: "cigarette", prompt: "cigarette trousers in black stretch wool, narrow and straight to the ankle" },
  { id: "bermudas", prompt: "tailored taupe Bermuda shorts with a hem at the lower thigh" },
  { id: "satinskirt", prompt: "a bias-cut champagne silk-satin slip midi skirt with a fluid drape" },
  { id: "khakichinos", prompt: "classic preppy pleated stone-khaki cotton chinos with a cuffed hem" },
  ...AMENDA_PANTS,
  ...BRANDING_PANTS,
  ...CASUAL_PANTS,
];

const HERITAGE_SHOES: readonly CharacterLookOption[] = [
  { id: "moccasins", prompt: "soft moose-hide moccasins with a puckered vamp and rawhide laces" },
  { id: "juttis", prompt: "Punjabi juttis, flat pointed slippers covered in gold-thread floral embroidery" },
  { id: "mojari", prompt: "Rajasthani mojari slippers with an upturned toe and small mirror-work on the vamp" },
  { id: "babouche", prompt: "Moroccan babouche pointed slippers in saffron leather with an open heel" },
  { id: "jikatabi", prompt: "Japanese jika-tabi split-toe work shoes in white canvas with a thin black rubber sole" },
  { id: "gomusin", prompt: "Korean gomusin, boat-shaped black rubber shoes with a low collar" },
  { id: "kamik", prompt: "Inuit kamik boots in pale hide, rising to the calf, with a fur band at the top" },
  { id: "ghillie", prompt: "Scottish ghillie brogues in brown leather with long laces and no tongue" },
  { id: "kungfu", prompt: "Chinese kung-fu cloth shoes in black cotton with a flat white sole and a cord tie" },
  { id: "waraji", prompt: "Japanese waraji sandals woven from straw with rope ties across the foot" },
  { id: "paduka", prompt: "Indian wooden paduka sandals with a single toe knob and a flat sole" },
  { id: "opanci", prompt: "Balkan opanci in brown leather with a curled nose and woven leather straps" },
  { id: "alpargata", prompt: "Argentine alpargatas, canvas slip-ons with a jute rope sole and a natural heel" },
  { id: "valenki", prompt: "Russian valenki, tall grey felt boots with a plain shaft and no heel decoration" },
  { id: "abarka", prompt: "Basque abarka sandals of a single piece of rawhide, laced over the instep" },
  { id: "zori", prompt: "Japanese zori sandals with a woven straw sole and a black fabric thong" },
];

const STYLIZED_SHOES: readonly CharacterLookOption[] = [
  { id: "balletflats", prompt: "black leather ballet flats with a tiny bow on the toe and a thin sole" },
  { id: "maryjanes", prompt: "glossy black Mary Jane shoes with one instep strap and a low heel" },
  { id: "slingbacks", prompt: "nude slingback pumps with a pointed toe and a thin heel strap" },
  { id: "winklepickers", prompt: "1960s winklepicker boots in black leather with an extremely long pointed toe" },
  { id: "combat", prompt: "black combat boots with thick lugged soles and eight pairs of eyelets" },
  { id: "gogo", prompt: "white 1960s go-go boots in shiny vinyl, rising to the knee" },
  { id: "creepers", prompt: "brothel creepers in oxblood leather with a very thick crepe sole" },
  { id: "wallabee", prompt: "sand suede wallabee shoes with a moc toe and a crepe wedge sole" },
  { id: "jelly", prompt: "translucent cherry-red jelly sandals with two wide straps" },
  { id: "ridingboots", prompt: "tall black leather riding boots with a smooth shaft to the knee" },
  { id: "moonboots", prompt: "puffy nylon moon boots in silver with a rounded toe and a thick white sole" },
  { id: "spectators", prompt: "two-tone spectator shoes in white leather with black wingtip overlays" },
  { id: "kittenheels", prompt: "sleek 1990s minimalist burgundy patent-leather kitten-heel mules" },
  { id: "platformboots", prompt: "chunky black leather platform ankle boots with a side zip and lugged sole" },
  { id: "retrotrainers", prompt: "1970s vintage suede-and-nylon low-profile gum-sole terrace trainers" },
  { id: "gladiator", prompt: "artisanal crisscrossed tan leather strappy flat gladiator sandals" },
  ...SPORTS_SHOES,
];

const CLASSIC_SHOES: readonly CharacterLookOption[] = [
  { id: "derby", prompt: "brown leather derby shoes with open lacing and a plain toe" },
  { id: "monkstrap", prompt: "black leather single-monk shoes with one buckle strap across the instep" },
  { id: "hiking", prompt: "brown leather hiking boots with a padded collar and a deep lug sole" },
  { id: "flipflops", prompt: "plain black rubber flip-flops with a Y-shaped thong" },
  { id: "wellingtons", prompt: "matte dark-green wellington boots, calf height, with a smooth shaft" },
  { id: "desert", prompt: "tan suede desert boots with two eyelets and a crepe sole" },
  { id: "boatshoes", prompt: "brown leather boat shoes with rawhide laces and a white rubber sole" },
  { id: "slides", prompt: "minimal black leather slides with one wide strap" },
  { id: "runners", prompt: "grey technical running shoes with a thick foam midsole and a knit upper" },
  { id: "espadrilles", prompt: "navy canvas espadrilles with a braided jute wedge and a closed toe" },
  { id: "chukka", prompt: "olive suede chukka boots, ankle height, with two pairs of eyelets" },
  { id: "bitloafers", prompt: "black leather horsebit loafers with a gold-tone metal bit across the vamp" },
  { id: "drivingmoc", prompt: "supple navy suede driving moccasins with a pebbled rubber heel outsole" },
  { id: "courtshoe", prompt: "classic white leather tennis court shoes with forest-green heel tabs" },
  ...BRANDING_SHOES,
  ...CASUAL_SHOES,
];

const HERITAGE_ACCESSORIES: readonly CharacterLookOption[] = [
  { id: "hijab", prompt: "a softly draped ivory hijab covering the hair and wrapping the neck" },
  { id: "keffiyeh", prompt: "a black-and-white keffiyeh scarf folded around the neck with the ends over one shoulder" },
  { id: "dupatta", prompt: "a sheer blush dupatta with a gold border, draped over the head and one shoulder" },
  { id: "turban", prompt: "a neatly wrapped saffron silk turban with a smooth front and a tucked end" },
  { id: "nonla", prompt: "a Vietnamese non la conical palm-leaf hat, wide and level, sitting on the head" },
  { id: "ushanka", prompt: "a grey fur ushanka with the ear flaps tied down under the chin" },
  { id: "fez", prompt: "a maroon fez with a flat top and a black tassel hanging to one side" },
  { id: "kufi", prompt: "a white embroidered kufi cap sitting close to the scalp" },
  { id: "rebozo", prompt: "a Mexican rebozo shawl in narrow stripes of indigo and cream, draped over both shoulders" },
  { id: "maangtikka", prompt: "a gold maang tikka with a fine chain along the hair part and a small pendant on the forehead" },
  { id: "gele", prompt: "a sculptural Nigerian gele headwrap in bright yellow ankara, rising above the forehead" },
  { id: "songkok", prompt: "a plain black Malay songkok, a brimless velvet cap with a slightly tapered crown" },
  { id: "gat", prompt: "a Korean gat of black horsehair, with a tall cylindrical crown and a wide flat brim" },
  { id: "jadebangle", prompt: "a translucent imperial-green jadeite cabochon pendant on a braided silk cord at the collarbone" },
];

const STYLIZED_ACCESSORIES: readonly CharacterLookOption[] = [
  { id: "bucket", prompt: "a khaki cotton bucket hat with a short downward brim" },
  { id: "beanie", prompt: "a black ribbed-knit beanie pulled low on the forehead" },
  { id: "cloche", prompt: "a 1920s felt cloche hat in taupe, fitted close with a small side bow" },
  { id: "newsboy", prompt: "a tweed newsboy cap in brown with a short stiff brim" },
  { id: "bandana", prompt: "a red cotton bandana folded into a triangle and tied at the back of the neck" },
  { id: "hoops", prompt: "large thin gold hoop earrings, one on each ear" },
  { id: "cateye", prompt: "1950s retro upswept glossy black acetate cat-eye sunglasses" },
  { id: "choker", prompt: "a 1990s black velvet ribbon choker necklace with a small silver charm" },
  { id: "chain", prompt: "a chunky heavyweight polished Cuban-link sterling silver neck chain" },
  { id: "crossbody", prompt: "a sleek matte-black technical nylon crossbody chest bag strap worn diagonally across the torso" },
  { id: "earcuff", prompt: "sculptural modernist polished silver ear cuffs worn along the outer ear" },
  ...SPORTS_ACCESSORIES,
];

const CLASSIC_ACCESSORIES: readonly CharacterLookOption[] = [
  { id: "fedora", prompt: "a grey felt fedora with a pinched crown and a medium brim" },
  { id: "baseballcap", prompt: "a plain navy baseball cap with a curved brim" },
  { id: "bowtie", prompt: "a black silk bow tie, neatly tied, centered at the collar" },
  { id: "necktie", prompt: "a solid navy silk necktie in a four-in-hand knot" },
  { id: "pearearrings", prompt: "small round pearl stud earrings, one on each earlobe" },
  { id: "pendant", prompt: "a single fine gold chain with a small oval locket resting at the collarbone" },
  { id: "panamahat", prompt: "a handwoven cream Toquilla straw Panama hat with a black grosgrain ribbon band" },
  { id: "cashmerescarf", prompt: "a soft camel cashmere winter scarf draped once around the neck" },
  ...BRANDING_ACCESSORIES,
  ...CASUAL_ACCESSORIES,
];

function ids(options: readonly CharacterLookOption[]) {
  return options.map((option) => option.id);
}

export const EXTRA_HAIR: readonly CharacterLookOption[] = [
  ...HERITAGE_HAIR,
  ...STYLIZED_HAIR,
  ...CLASSIC_HAIR,
];
export const EXTRA_TOPS: readonly CharacterLookOption[] = [
  ...HERITAGE_TOPS,
  ...STYLIZED_TOPS,
  ...CLASSIC_TOPS,
];
export const EXTRA_PANTS: readonly CharacterLookOption[] = [
  ...HERITAGE_PANTS,
  ...STYLIZED_PANTS,
  ...CLASSIC_PANTS,
];
export const EXTRA_SHOES: readonly CharacterLookOption[] = [
  ...HERITAGE_SHOES,
  ...STYLIZED_SHOES,
  ...CLASSIC_SHOES,
];
export const EXTRA_ACCESSORIES: readonly CharacterLookOption[] = [
  ...HERITAGE_ACCESSORIES,
  ...STYLIZED_ACCESSORIES,
  ...CLASSIC_ACCESSORIES,
];

export const EXTRA_HERITAGE_HAIR_IDS = ids(HERITAGE_HAIR);
export const EXTRA_STYLIZED_HAIR_IDS = ids(STYLIZED_HAIR);
export const EXTRA_HERITAGE_TOP_IDS = ids(HERITAGE_TOPS);
export const EXTRA_STYLIZED_TOP_IDS = ids(STYLIZED_TOPS);
export const EXTRA_HERITAGE_PANTS_IDS = ids(HERITAGE_PANTS);
export const EXTRA_STYLIZED_PANTS_IDS = ids(STYLIZED_PANTS);
export const EXTRA_HERITAGE_SHOES_IDS = ids(HERITAGE_SHOES);
export const EXTRA_STYLIZED_SHOES_IDS = ids(STYLIZED_SHOES);
export const EXTRA_HERITAGE_ACCESSORY_IDS = ids(HERITAGE_ACCESSORIES);
export const EXTRA_STYLIZED_ACCESSORY_IDS = ids(STYLIZED_ACCESSORIES);
