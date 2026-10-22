/**
 * Generate brand-new original characters and native-aspect stills for all 6 feature pages
 * via OpenRouter Seedream 5 Pro. No character face is reused from the landing page or account library.
 *
 * Usage: npx tsx scripts/gen-feature-pages-art.ts [--only=ai-hero,th-hero]
 */
import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { AspectRatio } from "@/model/project";

loadEnvConfig(process.cwd());

type Shot = {
  id: string;
  file: string;
  aspectRatio: AspectRatio;
  prompt: string;
};

const NO_TEXT =
  "No watermark, no logo, no letters, no readable words, no numbers, no UI text chrome.";

// Every shot defines a brand-new original character persona distinct from landing page cast.
const SHOTS: Shot[] = [
  // ======================== 1. /ai-influencer ========================
  {
    id: "ai-hero",
    file: "public/landing/ai-influencer/hero.jpg",
    aspectRatio: "16:9",
    prompt: `Cinematic photoreal editorial on a dark olive-charcoal studio stage with subtle lime #c6f24b rim light. Brand-new fictional French-Moroccan female creator in her late 20s with warm olive skin, defined cheekbones, honey-brown eyes, and sleek shoulder-length wavy espresso hair with curtain bangs, wearing an ivory structured blazer over a sage knit top. Left side shows her in a warm studio speaking expressively with a notebook; right side shows a floating sleek glass portrait frame of her identical face in a street-style trench coat Look and a clay 3D avatar version. Original face only, full head and hair completely visible with generous headroom. ${NO_TEXT}`,
  },
  {
    id: "ai-inject",
    file: "public/landing/ai-influencer/inject.jpg",
    aspectRatio: "16:9",
    prompt: `Clean 16:9 split studio diptych on warm cream and charcoal. Left: brand-new fictional Nordic-Asian male creator (late 20s, silver-ash textured crop hair, warm amber eyes, round titanium glasses, olive cardigan) sketching story notes in a notebook at a walnut desk. Right: a glowing smartphone screen showing his identical virtual KOL persona speaking charismatically in a modern studio with a subtle lime #c6f24b ring glow. Full head visible with generous headroom. ${NO_TEXT}`,
  },
  {
    id: "ai-social",
    file: "public/landing/ai-influencer/social.jpg",
    aspectRatio: "16:9",
    prompt: `Wide 16:9 lifestyle triptych of a brand-new fictional Brazilian female virtual KOL (mid-20s, golden-tan skin, freckles, braided crown updo, bright hazel eyes) across three distinct daily moments: left in a sunlit botanical café holding a ceramic matcha cup, center walking a cobblestone street in a linen trench coat, right in an evening rooftop lounge with warm bokeh lights. Identical face in all three frames, full head and hair visible. ${NO_TEXT}`,
  },
  {
    id: "ai-ip-wardrobe",
    file: "public/landing/ai-influencer/ip-wardrobe.jpg",
    aspectRatio: "1:1",
    prompt: `Square photo, 3 by 3 grid, thin lime gaps, dark studio. Nine DIFFERENT people, full head in every cell. Six are East or Southeast Asian. Three are not. East Asian woman, silk drape, black trousers. East Asian man, ivory suit. Black woman, silver cropped jacket, wide indigo pants. East Asian woman, cherry leather jacket, cream knit mini. Southeast Asian woman, olive trench, silk scarf. White woman, tangerine knit, charcoal pleated skirt. East Asian woman, yellow polo, tennis skirt. Black man, black turtleneck, sand overcoat. East Asian woman, navy cropped blazer, plaid kilt. No words. ${NO_TEXT}`,
  },
  {
    id: "ai-ip-life",
    file: "public/landing/ai-influencer/ip-life.jpg",
    aspectRatio: "1:1",
    prompt: `Square photo, 3 by 3 grid, thin white gaps. Same East Asian woman in all 9 cells: late 20s, straight black shoulder-length hair, dark brown eyes, light-medium skin. Each cell a different life post and outfit. Gym mirror selfie. Neon night-market food. Airplane window. Home kitchen cooking. Rainy night with a yellow umbrella. Sunny beach. Dark podcast desk. Flower market. Purple concert. Full head in every cell. No words. ${NO_TEXT}`,
  },
  {
    id: "ai-ip-daily",
    file: "public/landing/ai-influencer/ip-daily.jpg",
    aspectRatio: "16:9",
    prompt: `Wide 16:9 five-panel daily timeline strip on dark charcoal studio ground. Five rounded vertical cards side-by-side showing a brand-new fictional Dutch-Indonesian male virtual creator (late 20s, curly dark-brown hair, warm smile) across five days of the week: Monday studio mic, Tuesday coffee roastery, Wednesday gym recovery, Thursday street fashion look, Friday sunset rooftop. Full head visible in all five cards. ${NO_TEXT}`,
  },
  {
    id: "ai-ip-custom",
    file: "public/landing/ai-influencer/ip-custom.jpg",
    aspectRatio: "16:9",
    prompt: `Wide 16:9 fashion studio showcase: on the left, three floating fabric & outfit moodboard cards (denim workwear, avant-garde silver puffer, tailored linen suit) connected by a glowing lime #c6f24b line to the right, where a brand-new fictional Nigerian-British female virtual model (mid-20s, sculpted finger-waves hairstyle, radiant dark skin) poses in the finished tailored linen suit in a minimalist architectural studio. Full head visible. ${NO_TEXT}`,
  },
  {
    id: "ai-earn",
    file: "public/landing/ai-influencer/earn.jpg",
    aspectRatio: "16:9",
    prompt: `High-fashion commercial studio still (16:9). Brand-new fictional Korean-American female creator (early 30s, sleek high ponytail, sharp cat-eye liner, wearing a tailored emerald satin shirt) presenting a minimalist matte botanical serum bottle beside a floating glass analytics card with abstract rising lime #c6f24b bar shapes and heart icons. Dark charcoal studio backdrop with warm key light. Full head visible. ${NO_TEXT}`,
  },
  {
    id: "ai-offcamera",
    file: "public/landing/ai-influencer/offcamera.jpg",
    aspectRatio: "16:9",
    prompt: `Cinematic 16:9 contrast scene. Left half: a relaxed creator in a cozy dimly lit home study (brand-new fictional Mediterranean man in his 30s with short salt-and-pepper beard and linen overshirt) sipping coffee calmly at his laptop, no camera crew or lights. Right half: his vibrant 3D stylized virtual host counterpart on a glowing stage screen delivering a high-energy keynote to floating social engagement icons in lime #c6f24b. Full heads visible. ${NO_TEXT}`,
  },

  // ======================== 2. /product-promo ========================
  {
    id: "pp-hero",
    file: "public/landing/product-promo/hero.jpg",
    aspectRatio: "16:9",
    prompt: `Cinematic photoreal commercial still (16:9) on a dramatic volcanic black-sand set with glowing amber mist and subtle lime #c6f24b rim light. Brand-new fictional Scandinavian-Latino male virtual host (late 20s, bronze skin, wavy chestnut hair, sharp jawline, wearing a technical charcoal bomber jacket) holding up a sleek frosted-glass cologne bottle towards camera with confident charisma. Full head and hair completely in frame. ${NO_TEXT}`,
  },
  {
    id: "pp-cost",
    file: "public/landing/product-promo/cost.jpg",
    aspectRatio: "16:9",
    prompt: `Wide 16:9 visual comparison. Left side: cluttered, dimly lit traditional film studio crowded with heavy boom mics, tangled cables, and empty folding chairs. Right side: bright, clean minimalist studio frame where a brand-new fictional Southeast Asian female virtual host (mid-20s, sleek chin-length bob with micro-bangs, wearing a butter-yellow knit polo) effortlessly presents a wireless headphone case against a crisp lime-tinted backdrop. Full head visible. ${NO_TEXT}`,
  },
  {
    id: "pp-upload",
    file: "public/landing/product-promo/upload.jpg",
    aspectRatio: "16:9",
    prompt: `Clean 16:9 three-step visual flow on a dark ink studio surface. Left: a floating product photo card of a coral ceramic insulated tumbler. Middle: a portrait card of a brand-new fictional mixed-race female host (late 20s, copper curls in a pineapple puff, gold hoop earrings, denim flight suit) connected by a glowing lime #c6f24b arrow. Right: a vertical phone frame showing her holding that exact coral tumbler in a sunlit desert canyon. Full head visible. ${NO_TEXT}`,
  },
  {
    id: "pp-iceberg",
    file: "public/landing/product-promo/iceberg.jpg",
    aspectRatio: "16:9",
    prompt: `Epic 16:9 commercial shot on a glittering turquoise glacial iceberg under a crisp arctic sky. Brand-new fictional East Asian male virtual host (late 20s, platinum-blonde textured hair, wearing a sleek silver insulated puffer vest over a black turtleneck) holding a frosted sparkling water can with condensation droplets. Full head and hair completely visible with generous headroom. ${NO_TEXT}`,
  },
  {
    id: "pp-fire",
    file: "public/landing/product-promo/fire.jpg",
    aspectRatio: "16:9",
    prompt: `Dramatic 16:9 commercial shot in a cinematic obsidian forge with controlled golden fire sparks and warm rim light. Brand-new fictional Afro-Caribbean female virtual host (late 20s, sculpted high braided bun, radiant dark skin, wearing a structured crimson leather Moto jacket) showcasing a matte-black chili oil bottle. Full head and hair completely visible. ${NO_TEXT}`,
  },
  {
    id: "pp-mars",
    file: "public/landing/product-promo/mars.jpg",
    aspectRatio: "16:9",
    prompt: `Surreal 16:9 commercial shot on a red Martian canyon ridge with twin moons in a deep violet sky. Brand-new fictional South Asian male virtual host (early 30s, groomed beard, wavy raven hair, wearing a futuristic ivory & lime #c6f24b expedition jacket with open helmet visor) presenting a sleek metallic espresso travel mug. Full head visible. ${NO_TEXT}`,
  },

  // ======================== 3. /right-tool ========================
  {
    id: "rt-hero",
    file: "public/landing/right-tool/hero.jpg",
    aspectRatio: "16:9",
    prompt: `Bold contemporary neo-woodblock & clean vector hybrid illustration (16:9) on a dark ink #0a0c10 stage with lime #c6f24b accents. Brand-new fictional female creative director (early 30s, copper-red geometric bob, wearing rectangular tortoiseshell glasses and an olive studio jumpsuit) calmly conducting three floating holographic storyboard frames (a 3D clay chef, a watercolor traveler, and a photoreal tech host) that assemble into a finished video reel. Full head visible. ${NO_TEXT}`,
  },
  {
    id: "rt-character",
    file: "public/landing/right-tool/character.jpg",
    aspectRatio: "16:9",
    prompt: `Clean 16:9 character wardrobe lookbook card. Brand-new fictional Italian-Japanese female virtual creator (mid-20s, long straight jet-black hair with hime-cut cheek locks, warm ivory skin) shown in three head-to-waist panels side by side: left in a tailored charcoal blazer, center in a casual sage streetwear hoodie, right in an evening terracotta silk halter. Dark studio background with thin lime #c6f24b frame accents. Full heads completely visible. ${NO_TEXT}`,
  },
  {
    id: "rt-life",
    file: "public/landing/right-tool/life.jpg",
    aspectRatio: "16:9",
    prompt: `Clean 16:9 lifestyle feed triptych of the same brand-new fictional Italian-Japanese female creator (hime-cut black hair): left browsing vinyl records in a sunlit Tokyo shop, center holding iced coffee by a canal bridge, right reading under warm fairy lights on a balcony. Crisp photoreal editorial, full heads and hair completely visible in every panel. ${NO_TEXT}`,
  },
  {
    id: "rt-video",
    file: "public/landing/right-tool/video.jpg",
    aspectRatio: "16:9",
    prompt: `Clean 16:9 multi-format video showcase on dark charcoal. Three rounded video player frames side by side featuring brand-new original hosts: left a 3D clay bearded barista explaining coffee grind, center the Italian-Japanese female creator in a talking-head reel with a glowing lime play button, right a vibrant pop-art female musician holding a synthesizer. Full heads visible. ${NO_TEXT}`,
  },

  // ======================== 4. /talking-head ========================
  {
    id: "th-hero",
    file: "public/landing/talking-head/hero.jpg",
    aspectRatio: "16:9",
    prompt: `Cinematic 16:9 studio showcase on dark ink #0a0c10. Left & center: brand-new fictional British-Indian female presenter (late 20s, warm caramel skin, glossy dark shoulder-length curls, wearing a mustard-gold cashmere crew neck) speaking naturally into a studio condenser mic with warm key light and lime #c6f24b rim light. Right: a floating vertical phone preview showing her identical frame with clean abstract lime caption pill bars at the bottom. Generous headroom, full head and hair visible. ${NO_TEXT}`,
  },
  {
    id: "th-wardrobe",
    file: "public/landing/talking-head/wardrobe.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 three-panel outfit & set selector for a brand-new fictional British-Indian female presenter (glossy dark shoulder-length curls): left panel in a crisp white Oxford shirt in a sunlit bookshelf study, middle panel in an olive blazer in a modern glass office, right panel in a cozy oatmeal knit sweater in a warm living room. Identical face in all three panels, generous headroom so full head and hair are never cropped. ${NO_TEXT}`,
  },
  {
    id: "th-script",
    file: "public/landing/talking-head/script.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 studio scene: sleek dark-mode laptop on a minimalist walnut desk showing three color-coded storyboard blocks with lime #c6f24b waveform bars, while beside the laptop a glowing portrait monitor shows a brand-new fictional Latino male presenter (early 30s, wavy dark hair, warm smile, navy overshirt) mid-speech in perfect sync. Full head visible. ${NO_TEXT}`,
  },
  {
    id: "th-captions",
    file: "public/landing/talking-head/captions.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 close editorial shot: hands holding a modern bezel-less smartphone horizontally tilted in a warm studio; on screen, a brand-new fictional East Asian female presenter (late 20s, chestnut lob haircut, pearl earrings, sage blazer) speaks expressively with clean stylized lime #c6f24b and white caption pill highlights floating below her chin. Full head visible inside the screen. ${NO_TEXT}`,
  },
  {
    id: "th-balance",
    file: "public/landing/talking-head/balance.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 split creative studio scene: on the left, a brand-new fictional female video producer (mid-20s, braided ponytail, denim shirt) adjusts a tactile audio fader controller with glowing lime #c6f24b LEDs; on the right, a large studio display shows a 3D clay-style male talking-head host in a vibrant yellow beanie gesturing enthusiastically. Full heads visible. ${NO_TEXT}`,
  },

  // ======================== 5. /cantonese ========================
  {
    id: "hk-hero",
    file: "public/landing/cantonese/hero.jpg",
    aspectRatio: "16:9",
    prompt: `Cinematic 16:9 Hong Kong lifestyle commercial still. Brand-new fictional Hong Kong female boutique founder (late 20s, sleek dark-brown layered collarbone hair, warm friendly eyes, wearing a chic cream tweed vest over a black top) standing inside a sunlit Sheung Wan lifestyle café-studio with warm wood shelves and neon-lime accent art, speaking warmly to camera while holding a ceramic dripper. Victoria Harbour twilight glow through the window. Full head visible. ${NO_TEXT}`,
  },
  {
    id: "hk-sme",
    file: "public/landing/cantonese/sme.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 editorial portrait in a bright Hong Kong artisan leather & watch workshop: brand-new fictional Hong Kong male solo founder (early 30s, clean tapered fade haircut, tortoiseshell glasses, olive workwear apron over a white tee) smiling and explaining a handcrafted watch strap to a smartphone on a tabletop tripod. Warm natural window light, full head and hair completely visible. ${NO_TEXT}`,
  },
  {
    id: "hk-product",
    file: "public/landing/cantonese/product.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 Hong Kong bakery & tea brand showcase: a brand-new fictional Hong Kong female host (mid-20s, airy bangs with half-up bun, wearing a pastel pistachio cardigan) in a modern artisanal bakery holding a box of golden flaky pastries, while a sleek phone in the foreground frames her in a live vertical product pitch. Full head visible. ${NO_TEXT}`,
  },
  {
    id: "hk-reel",
    file: "public/landing/cantonese/reel.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 vibrant Hong Kong street-to-reel scene in Central: brand-new fictional Hong Kong male tech & gadget reviewer (mid-20s, messy textured black hair, wearing a charcoal utility vest over a lime-accented hoodie) speaking energetically to camera with iconic red taxis and warm tram lights softly blurred in the evening background. Generous headroom, full head visible. ${NO_TEXT}`,
  },

  // ======================== 6. /explainer ========================
  {
    id: "ex-hero",
    file: "public/landing/explainer/hero.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 crisp whiteboard & clay hybrid studio scene on dark ink #0a0c10. Left: a brand-new original 3D clay-style female architect character (round glasses, coral beret, teal sweater) holding a glowing lime #c6f24b marker. Right: a large luminous off-white storyboard canvas where clean hand-drawn charcoal and lime doodle diagrams (lightbulb, gear flow, rocket launch) come alive with subtle depth. Full character head and beret completely visible. ${NO_TEXT}`,
  },
  {
    id: "ex-present",
    file: "public/landing/explainer/present.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 modern keynote & deck scene: a sleek wide conference screen displaying a crisp hand-drawn whiteboard doodle diagram of a product funnel in charcoal and lime #c6f24b, while in the corner of the slide a brand-new original colored-pencil illustrated male host (curly dark hair, mustard cardigan) points at the key metric. Clean minimalist boardroom. ${NO_TEXT}`,
  },
  {
    id: "ex-email",
    file: "public/landing/explainer/email.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 editorial desk scene: a sleek laptop showing a clean product launch email card with an embedded video thumbnail of a brand-new original watercolor-style female host (auburn bob, teal scarf) beside a hand-drawn diagram and a glowing lime #c6f24b play button. Warm morning light on a wooden desk. ${NO_TEXT}`,
  },
  {
    id: "ex-social",
    file: "public/landing/explainer/social.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 dynamic social explainer showcase: three vertical smartphone screens fanned cleanly on a dark charcoal stage, each showing a different step of a whiteboard doodle & pop-art explainer short hosted by a brand-new original stylized male character with cobalt-blue hair and round frames, connected by a glowing lime #c6f24b motion arc. Full heads visible. ${NO_TEXT}`,
  },
  {
    id: "ex-whiteboard",
    file: "public/landing/explainer/whiteboard.jpg",
    aspectRatio: "16:9",
    prompt: `16:9 crisp overhead & angled studio illustration of a whiteboard doodle storyboard in action: off-white paper canvas with bold black marker illustrations of a friendly original cartoon female scientist (goggles on forehead, lab coat, lime #c6f24b scarf) connecting four visual concept nodes with hand-drawn lime arrows and stars. Clean, high-contrast, full character visible. ${NO_TEXT}`,
  },

  // Extra example stills. New East / Southeast Asian faces, not the landing cast.
  { id: "ai-ex-cafe", file: "public/landing/ai-influencer/ex-cafe.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian woman, late 20s, black bob, linen shirt, sitting in a bright café with a ceramic cup, smiling at camera. Full head. ${NO_TEXT}` },
  { id: "ai-ex-desk", file: "public/landing/ai-influencer/ex-desk.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian man, early 30s, short black hair, olive cardigan, explaining at a home desk with a notebook. Full head. ${NO_TEXT}` },
  { id: "ai-ex-street", file: "public/landing/ai-influencer/ex-street.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New Southeast Asian woman, mid 20s, long black hair, cream trench, walking a sunny city street. Full head. ${NO_TEXT}` },
  { id: "ai-ex-unbox", file: "public/landing/ai-influencer/ex-unbox.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian woman, late 20s, low ponytail, holding a frosted skincare bottle toward camera on a pale table. Full head. ${NO_TEXT}` },
  { id: "pp-ex-serum", file: "public/landing/product-promo/ex-serum.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian woman, bathroom shelf, presenting a glass serum bottle, soft daylight. Full head. ${NO_TEXT}` },
  { id: "pp-ex-phones", file: "public/landing/product-promo/ex-phones.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian man, city crosswalk, wearing matte black headphones, charcoal jacket. Full head. ${NO_TEXT}` },
  { id: "pp-ex-snack", file: "public/landing/product-promo/ex-snack.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New Southeast Asian woman at a neon night market, holding a snack pouch, warm lights. Full head. ${NO_TEXT}` },
  { id: "pp-ex-sneaker", file: "public/landing/product-promo/ex-sneaker.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian man in a dark studio, holding a white sneaker, lime rim light. Full head. ${NO_TEXT}` },
  { id: "rt-ex-talk", file: "public/landing/right-tool/ex-talk.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian woman speaking to camera in a small dark studio, sage blazer. Full head. ${NO_TEXT}` },
  { id: "rt-ex-board", file: "public/landing/right-tool/ex-board.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian man beside a whiteboard of simple doodle arrows and a lightbulb, no letters. Full head. ${NO_TEXT}` },
  { id: "rt-ex-promo", file: "public/landing/right-tool/ex-promo.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian woman on a dark set holding a matte bottle, lime rim light. Full head. ${NO_TEXT}` },
  { id: "rt-ex-edit", file: "public/landing/right-tool/ex-edit.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian editor at a desk, large monitor with a blurred timeline, no readable text. Full head. ${NO_TEXT}` },
  { id: "th-ex-room", file: "public/landing/talking-head/ex-room.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian woman talking to camera from a bright living room sofa. Full head. ${NO_TEXT}` },
  { id: "th-ex-phone", file: "public/landing/talking-head/ex-phone.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian man framed like a vertical phone video, standing in a tidy apartment. Full head. ${NO_TEXT}` },
  { id: "th-ex-wardrobe", file: "public/landing/talking-head/ex-wardrobe.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian woman in a navy blazer in front of a clothing rack, studio light. Full head. ${NO_TEXT}` },
  { id: "th-ex-podcast", file: "public/landing/talking-head/ex-podcast.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian man with headphones at a podcast mic, dark desk. Full head. ${NO_TEXT}` },
  { id: "hk-ex-cafe", file: "public/landing/cantonese/ex-cafe.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New Hong Kong woman in a cha chaan teng, apron, talking to camera beside milk tea. Full head. ${NO_TEXT}` },
  { id: "hk-ex-shop", file: "public/landing/cantonese/ex-shop.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New Hong Kong woman in a small fashion boutique, holding a folded shirt. Full head. ${NO_TEXT}` },
  { id: "hk-ex-workshop", file: "public/landing/cantonese/ex-workshop.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New Hong Kong man in a small repair workshop, explaining a gadget on the bench. Full head. ${NO_TEXT}` },
  { id: "hk-ex-stall", file: "public/landing/cantonese/ex-stall.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New Hong Kong man at a street food stall at night, talking to camera. Full head. ${NO_TEXT}` },
  { id: "ex-ex-funnel", file: "public/landing/explainer/ex-funnel.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian woman pointing at a whiteboard funnel drawn in marker, no letters. Full head. ${NO_TEXT}` },
  { id: "ex-ex-nodes", file: "public/landing/explainer/ex-nodes.jpg", aspectRatio: "16:9", prompt: `16:9 illustration. Clean whiteboard doodle of four icon nodes linked by arrows, lime accents, no letters, no words. ${NO_TEXT}` },
  { id: "ex-ex-deck", file: "public/landing/explainer/ex-deck.jpg", aspectRatio: "16:9", prompt: `16:9 photo. New East Asian man presenting in a bright meeting room, screen shows a simple doodle diagram, no readable text. Full head. ${NO_TEXT}` },
  { id: "ex-ex-phones", file: "public/landing/explainer/ex-phones.jpg", aspectRatio: "16:9", prompt: `16:9 photo. Three phones on a dark desk showing colorful doodle frames, no readable text, lime edge light. ${NO_TEXT}` },
];

const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice(7)
  .split(",")
  .filter(Boolean);
const shots = SHOTS.filter((shot) => !only || only.includes(shot.id));

async function generate(shot: Shot) {
  const { submitOpenRouterImage, OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL } = await import(
    "@/service/openrouter/generate"
  );
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const submitted = await submitOpenRouterImage({
        model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
        prompt: shot.prompt,
        aspectRatio: shot.aspectRatio,
        resolution: "1k",
      });
      const url = submitted.images?.[0]?.url;
      if (!url || submitted.status === "nsfw") {
        throw new Error(submitted.error || "沒有圖片");
      }
      const bytes = url.startsWith("data:")
        ? Buffer.from(url.slice(url.indexOf(",") + 1), "base64")
        : Buffer.from(await (await fetch(url)).arrayBuffer());
      const dest = path.join(process.cwd(), shot.file);
      await mkdir(path.dirname(dest), { recursive: true });
      const targetWidth = shot.aspectRatio === "16:9" ? 1440 : 1200;
      const jpg = await sharp(bytes)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
      await writeFile(dest, jpg);
      console.log("wrote", shot.id, shot.file, jpg.length);
      return;
    } catch (err) {
      lastError = err;
      const cause = err instanceof Error && "cause" in err ? (err as Error & { cause?: unknown }).cause : undefined;
      console.warn(`retry ${attempt}/3 for ${shot.id}:`, err instanceof Error ? err.message : err, cause ?? "");
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastError;
}

async function main() {
  const queue = [...shots];
  const failures: string[] = [];
  async function worker() {
    for (;;) {
      const shot = queue.shift();
      if (!shot) return;
      try {
        await generate(shot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("fail", shot.id, message);
        failures.push(`${shot.id}: ${message}`);
      }
    }
  }
  await Promise.all([worker()]);
  if (failures.length) {
    console.error("Failures:\n" + failures.join("\n"));
    process.exit(1);
  }
}

main();
