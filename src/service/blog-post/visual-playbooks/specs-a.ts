import type { VisualPlaybookSpec } from "@/service/blog-post/visual-playbooks/types";

// Visual Playbooks 1–10: Lighting setups, low-light cinema looks, product lighting, camera angles, lenses, and framing.
export const SPECS_A: VisualPlaybookSpec[] = [
  {
    id: 1,
    slug: "5-lighting-setups-for-ai-video",
    title: "5 Lighting Setups to Know for AI Video",
    excerpt:
      "See 5 essential lighting setups for AI video—from soft window key light to neon dual-tone—with visual examples and prompt recipes.",
    locale: "en",
    landingPath: "/talking-head",
    tags: ["AI Video", "Talking Head", "Lighting", "Instagram Reels"],
    scene:
      "Cinematic portrait of an adult creator in a modern studio with warm key light on one side and soft cool fill on the other, camera on tripod in foreground, natural skin texture, no text, no logos",
    cta: "Test these lighting setups in Scro",
    answer:
      "Lighting is the fastest cue viewers use to judge whether an AI video looks like a real camera shoot or a flat synthetic cutout. When a prompt only names a person and a room, the generator defaults to even, shadowless illumination that makes skin look waxy and separates the speaker from the background. Naming one specific lighting direction, color temperature contrast, and shadow falloff gives the still frame real depth before a single frame of motion runs. Below are the five core lighting setups every AI video creator should know, complete with generated reference examples and how to lock each look.",
    examples: [
      {
        key: "ex-1",
        h: "1. Soft Window Key Light (45-Degree Daylight)",
        alt: "Example 1: Soft 45-degree north-facing window key light on an adult speaker with gentle cheek shadow falloff",
        scene:
          "Medium close-up of an adult founder speaking to camera beside a large diffused apartment window at 45 degrees, soft natural daylight wrapping across the cheekbone, gentle shadow falloff on the far side of the face, neutral plaster wall background, natural pores, no text, no logos",
        p: "Soft window key light is the gold standard for everyday founder updates, educational talking heads, and service explainers. Place a large diffused daylight source 45 degrees to one side of the camera so the near cheek is brightly lit while the far cheek drops into a smooth, readable shadow. That gentle gradient defines the jawline and nose bridge without harsh lines, and it leaves a clean rectangular catchlight in both eyes. When approving your start frame, check that the background wall is one stop darker than the face so the speaker naturally separates from the room.",
      },
      {
        key: "ex-2",
        h: "2. Golden Hour Rim & Backlight",
        alt: "Example 2: Warm golden hour backlight creating a luminous rim along the hair and shoulders while a bounce fill keeps the face clear",
        scene:
          "Medium portrait of an adult creator on a sunlit terrace at late afternoon golden hour, warm low sun behind the subject creating a glowing amber rim light along hair strands and shoulders, soft warm bounce light on the face, shallow depth of field, no text, no logos",
        p: "Golden hour rim light puts the sun behind the speaker at a low angle so hair strands and shoulders catch a warm amber halo while a soft front bounce keeps the eyes and mouth clear. This setup immediately signals outdoor lifestyle authenticity, travel, or personal storytelling. The rule that saves the shot is front fill: never let the face drop into a dark silhouette when the person needs to lip-sync. Inspect the approved still to confirm the iris and lip edges remain crisp while the amber rim stays on the hair and shoulder line.",
      },
      {
        key: "ex-3",
        h: "3. Rembrandt 45-Degree Studio Contrast",
        alt: "Example 3: Dramatic Rembrandt studio lighting with a warm key light forming an illuminated triangle on the shadow-side cheek",
        scene:
          "Editorial studio close-up of an adult host against a dark charcoal backdrop, high 45-degree warm key light creating a classic Rembrandt triangle of light under the eye on the shadow side of the face, rich cinematic contrast, natural skin texture, no text, no logos",
        p: "Rembrandt lighting raises the key light slightly above eye level and angles it until a small triangle of light appears just beneath the eye on the shadow side of the face. Use this look for high-ticket consulting, book hooks, finance breakdowns, and podcast clips where authority matters more than casual chatter. Because half the room falls into deep shadow, viewers focus entirely on the speaker's eyes and mouth movement. Reject any frame where the dark side of the face clips into pure black noise; you still want subtle ear and jaw detail in the shadows.",
      },
      {
        key: "ex-4",
        h: "4. Neon Dual-Tone Cyber Contrast (Warm vs. Cool)",
        alt: "Example 4: Dual-tone cyan and magenta-amber edge lighting on a creator in a dim modern studio",
        scene:
          "Cinematic medium shot of an adult tech reviewer in a dim modern studio, cool cyan key light from the left and warm amber-magenta tube rim light from the right, sleek dark background with subtle bokeh, sharp facial focus, no text, no logos",
        p: "Dual-tone lighting pairs two opposite color temperatures—typically a cool cyan or teal key on one side and a warm amber or magenta rim on the opposite edge. Tech reviewers, gaming channels, music producers, and night-life brands use this contrast to stop the scroll in dark-mode feeds. Keep the light hitting the center of the face closer to neutral or soft cyan so skin tone stays believable, and restrict the saturated neon color to the jawline, neck, and shoulder edge.",
      },
      {
        key: "ex-5",
        h: "5. High-Key Clamshell Beauty Light",
        alt: "Example 5: Bright high-key clamshell beauty lighting with an overhead softbox and white reflector under the chin",
        scene:
          "Bright studio beauty portrait of an adult skincare presenter in a clean cream studio, overhead diffused softbox key light with a white bounce card below the chin eliminating under-eye shadows, luminous natural skin texture with visible pores, no text, no logos",
        p: "Clamshell lighting stacks a large diffused key light slightly above the camera and a white bounce reflector right below chest level, wrapping the face in clean, shadow-free illumination. Skincare, cosmetics, dental, and clinical wellness brands rely on this setup because it erases dark under-eye circles without blurring real skin pores. When checking the still frame, verify that the nose bridge and philtrum still retain natural micro-texture—if the face looks airbrushed into plastic, lower the fill intensity before generating video.",
      },
    ],
    workedExample:
      "A skincare founder tests two versions of the same 20-second hook. The first uses a generic prompt with no lighting direction; the resulting frame looks flat and grey. The second specifies High-Key Clamshell Beauty Light for the morning routine beat and Golden Hour Rim Light for the outdoor payoff beat, keeping the exact same locked face across both clips. Watch time past three seconds jumps because the skin texture and eye catchlights read like a real studio camera.",
    bridge:
      "In Scro you can lock your host's face once and apply any of these five lighting directions on the start frame—or use Scro Swap's 17-look studio relight to transform existing footage into Golden Hour, Neon Cyber, or Soft Window daylight.",
    checks: [
      "Both eyes show a clean catchlight matching the key light direction.",
      "Skin pores and jaw edges remain sharp rather than smoothed into plastic.",
      "The background is at least one stop darker or lighter than the speaker's face.",
    ],
  },
  {
    id: 2,
    slug: "5-night-low-light-looks-for-ai-reels",
    title: "5 Night & Low-Light Looks for AI Video",
    excerpt:
      "Master 5 night and low-light AI video setups—from rain-wet street neon to warm desk lamps—without muddy shadows or plastic skin.",
    locale: "en",
    landingPath: "/app/scroswap",
    tags: ["AI Video", "Lighting", "Instagram Reels", "Talking Head"],
    scene:
      "Cinematic night portrait of an adult creator standing by a rain-streaked glass window overlooking city bokeh lights, warm interior lamp key light on face, sharp eyes, no text, no logos",
    cta: "Relight your night clips in Scro",
    answer:
      "Night and low-light scenes immediately stand out in a feed full of bright white daytime bedrooms, but most AI prompts ruin night shots by making the entire frame murky and underexposed. Real cinema night scenes are not dark everywhere—they combine deep background shadows with one motivated practical light source (a desk lamp, a streetlamp, a bistro candle, or a shop window) that cleanly illuminates the subject's eyes. Here are five proven low-light setups that give AI Reels rich nocturnal atmosphere while keeping lip-sync crystal clear.",
    examples: [
      {
        key: "ex-1",
        h: "1. Rain-Wet Street Neon & Shopfront Glow",
        alt: "Example 1: Night street portrait lit by warm shopfront glass and wet pavement reflections",
        scene:
          "Medium close-up of an adult in a trench coat on a rain-wet city sidewalk at night, warm tungsten light spilling from a glass shopfront onto the face, colorful street bokeh reflecting on wet pavement behind, 50mm lens, no text, no logos",
        p: "Wet pavement doubles the available light in a night street shot by turning the ground into a mirror for shop windows and traffic bokeh. Position the speaker near an unbranded glass storefront so warm tungsten light wraps across the face at eye level while the background recedes into deep blue-black bokeh. Check the still to make sure the rain stays on the street and coat shoulders—never let streaks cross the eyeballs or mouth.",
      },
      {
        key: "ex-2",
        h: "2. Warm Practical Desk Lamp in a Dark Study",
        alt: "Example 2: Late-night founder study lit by a single warm brass desk lamp",
        scene:
          "Adult entrepreneur at a wooden desk at night, a warm tungsten desk lamp just out of frame casting golden directional light across the face and notebook, dark bookshelves in soft shadow behind, intimate mood, no text, no logos",
        p: "For late-night founder reflections, coding logs, or finance breakdowns, a single warm 2700K desk lamp creates instant intimacy. Keep the room behind the speaker two stops darker in cool slate shadow so the golden lamp pool draws the viewer straight to the face. Approve the frame only when the lamp housing itself does not block the chin or cast a hard shadow across the mouth.",
      },
      {
        key: "ex-3",
        h: "3. Moody Bistro & Amber Candlelight",
        alt: "Example 3: Warm amber table lighting in an evening restaurant with soft background bokeh",
        scene:
          "Medium close-up of an adult seated at a wooden bistro table in the evening, warm amber tabletop candle glow illuminating the face from below-center, softly blurred warm pendant lights in the background, natural skin texture, no text, no logos",
        p: "Hospitality, wine, dining, and date-night lifestyle reels thrive on warm 2200K–2700K amber table light. Because real candles sit below chin height, pair the tabletop glow with a soft overhead pendant fill in your prompt so dark shadows do not form above the eyebrows. Keep glassware on the table unbranded and free of invented label text.",
      },
      {
        key: "ex-4",
        h: "4. Car Interior Night Drive & Streetlight Pass",
        alt: "Example 4: Parked car interior at night with soft dashboard fill and warm city streetlights outside the window",
        scene:
          "Medium shot of an adult sitting in a parked car interior at night speaking to camera, soft cool instrument cluster fill on the face, warm amber city streetlights glowing through the side window, realistic leather headrest, no text, no logos",
        p: "Car confessionals and post-meeting recaps perform well because the cabin feels private and immediate. Anchor the shot in a parked vehicle with soft cool dashboard fill from the front and warm amber streetlight bokeh outside the side window. Always keep the vehicle stationary in the prompt so the seatbelt, headrest, and window frame remain rock-steady during speech.",
      },
      {
        key: "ex-5",
        h: "5. Rooftop Blue Hour Dusk (Twilight Horizon)",
        alt: "Example 5: Rooftop twilight portrait balancing deep cobalt sky with a warm portable key light",
        scene:
          "Medium portrait of an adult host on an urban rooftop terrace during blue hour dusk, deep cobalt twilight sky and distant city lights behind, warm soft key light on the face for natural skin tones, 35mm cinematic lens, no text, no logos",
        p: "Blue hour—the twenty minutes right after sunset—gives you a rich cobalt sky that still holds detail instead of turning into a black void. Balance that cool blue horizon with a warm 3200K key light on the speaker's face so skin tones pop against the twilight skyline. Verify that distant buildings form clean bokeh dots rather than jagged fake signage.",
      },
    ],
    workedExample:
      "A SaaS founder records a 30-second evening recap. Instead of posting a grainy bedroom clip, they generate the start frame using the Warm Practical Desk Lamp setup and cut to a Rooftop Blue Hour B-roll shot. Both clips keep the exact same face and glasses while looking like a two-location documentary crew shoot.",
    bridge:
      "Scro lets you generate clean low-light start frames with Seedream 5.0 Pro or take a flat daytime video into Scro Swap and apply a nocturnal cinematic relight while preserving every spoken word.",
    checks: [
      "The speaker's eyes and mouth are clearly lit by a motivated warm or cool source.",
      "Background lights are clean bokeh circles with zero invented shop text.",
      "Shadow areas hold subtle texture instead of muddy grey blocks.",
    ],
  },
  {
    id: 3,
    slug: "5-product-lighting-angles-for-ecommerce-reels",
    title: "5 Product Lighting Angles for Promo Reels",
    excerpt:
      "Discover 5 commercial product lighting setups—from backlit liquid glow to brushed-metal specular highlights—with visual AI examples.",
    locale: "en",
    landingPath: "/product-promo",
    tags: ["Product Promo", "AI Video", "Lighting", "Ecommerce"],
    scene:
      "Luxury unbranded amber glass serum bottle on a wet slate stone podium with a warm golden backlight beam and crisp water droplets, macro commercial photography, no text, no logos",
    cta: "Create your product promo in Scro",
    answer:
      "A product promo reel succeeds or fails on how light hits the packaging material. Glass serum bottles, matte skincare tubes, brushed-steel watches, and ceramic mugs each reflect light differently: the flat front flash that works on a cardboard box turns a glass bottle into a dull, lifeless silhouette. Before you animate a hand picking up your product or a camera orbiting the podium, lock one of these five material-specific lighting setups on your still frame.",
    examples: [
      {
        key: "ex-1",
        h: "1. Backlit Translucent Liquid Glow (Glass & Serums)",
        alt: "Example 1: Backlit amber glass dropper bottle glowing from behind on a stone surface",
        scene:
          "Commercial macro shot of an unbranded amber glass dropper bottle on a travertine stone block, focused warm spotlight behind the bottle illuminating the golden liquid inside with an internal glow, soft rim light on the dropper cap, no text, no logos",
        p: "Never light translucent glass solely from the front. Placing a focused beam directly behind an amber, emerald, or frosted bottle pushes light through the liquid so the bottle glows from within like stained glass. Add two thin white strip reflections along the left and right edges to define the cylinder's silhouette, and keep the front face completely unbranded so the generator never invents gibberish letters.",
      },
      {
        key: "ex-2",
        h: "2. Hard Sunlight Caustics & Water Ripples",
        alt: "Example 2: Direct morning sunlight casting crisp water ripple caustics around a skincare bottle",
        scene:
          "Unbranded frosted glass cosmetic bottle standing in shallow clear water on a pale sand stone tray, direct morning sunlight casting sharp shimmering water caustic ripples across the stone and bottle base, fresh summer editorial mood, no text, no logos",
        p: "Hard, undiffused sunlight passing through water creates dancing caustic ribbons across stone and tile. Summer SPF, hydration mists, beverage cans, and bath products use this setup because the moving light pattern signals coolness and hydration before a single word is spoken. Check the still to ensure the bottle cap and shoulder geometry remain razor-sharp against the bright ripples.",
      },
      {
        key: "ex-3",
        h: "3. Soft Diffused Gradient on Matte Packaging",
        alt: "Example 3: Soft gradient studio light wrapping smoothly around a matte pastel skincare tube",
        scene:
          "Minimalist commercial still of an unbranded matte sage-green cosmetic tube resting on a smooth plaster arch podium, ultra-soft overhead gradient diffused light creating a seamless tonal roll-off across the matte cylinder, no harsh glare, no text, no logos",
        p: "Matte tubes, soft-touch boxes, and ceramic jars scatter light instead of reflecting mirror highlights. A harsh point light leaves an ugly white hot spot on matte plastic; a huge overhead scrim or gradient softbox creates a buttery transition from light to shadow that makes the packaging feel velvety to the touch.",
      },
      {
        key: "ex-4",
        h: "4. Linear Specular Highlight for Brushed Metal & Watches",
        alt: "Example 4: Crisp linear strip-box reflection across a brushed stainless steel chronograph watch on dark slate",
        scene:
          "Macro commercial shot of an unbranded brushed stainless steel wristwatch resting on a dark basalt stone slab, long narrow strip softbox casting a clean diagonal specular highlight across the bezel and sapphire crystal, dark moody background, no text, no logos",
        p: "Polished metal, chrome hardware, and watch bezels reflect their surroundings like a dark mirror. In an ordinary room they look black or muddy; under a long narrow strip-box they catch a razor-straight diagonal highlight across the bevels. Verify on the approved still that the dial and clasp contain zero invented brand crests or numbers.",
      },
      {
        key: "ex-5",
        h: "5. Dark Luxury Overhead Spotlight Podium",
        alt: "Example 5: Dramatic overhead cone spotlight isolating a black perfume flacon on a dark marble pedestal",
        scene:
          "High-contrast luxury product shot of an unbranded faceted dark glass perfume bottle on a black Nero Marquina marble pedestal, single tight overhead spotlight cone illuminating the bottle facets and casting a crisp pool of light on the stone, deep black background, no text, no logos",
        p: "When launching a hero fragrance, leather accessory, or premium gadget, a tight overhead snoot spotlight on a dark marble podium strips away every distraction. The light pool touches only the product and the top surface of the pedestal while the background falls into pure velvet black, leaving clean negative space in the upper third for your burned-in price or launch hook.",
      },
    ],
    workedExample:
      "A boutique fragrance shop builds a 15-second launch reel. Beat one uses the Dark Luxury Overhead Spotlight Podium to reveal the bottle shape; beat two switches to Backlit Translucent Liquid Glow so viewers see the amber oil inside. Both clips keep the bottle blank and place the brand name cleanly in the burned-in upper-middle caption.",
    bridge:
      "Scro's Product Promo workflow locks your exact packaging silhouette and renders commercial studio lighting with Seedream 5.0 Pro before animating smooth 9:16 camera motion.",
    checks: [
      "The lighting matches the packaging material (backlit for glass, diffused for matte, strip light for metal).",
      "The product surface has zero invented letters, crests, or fake barcodes.",
      "The bottle cap and proportions match your reference photo.",
    ],
  },
  {
    id: 4,
    slug: "ai-拍片必學-5-款電影級燈光範例",
    title: "AI 拍片必學 5 款電影級燈光範例",
    excerpt:
      "拆解 5 款 AI 短片必學電影級燈光設定，由自然落地窗柔光到雙色霓虹夜景，每款附 Seedream 實測範例圖與調光重點。",
    locale: "zh-Hant",
    landingPath: "/cantonese?hl=zh-Hant",
    tags: ["Cantonese", "AI Video", "Lighting", "Instagram Reels"],
    scene:
      "Cinematic portrait of a Hong Kong adult creator in a modern studio with warm 45-degree key light and subtle cool rim light, camera lens in foreground, natural skin pores, no text, no logos",
    cta: "即刻喺 Scro 試用電影級打光",
    answer:
      "好多香港店主同創作者用 AI 出片時，覺得畫面一眼睇落「好似假人」，最大原因往往唔係五官，而係燈光太過平淡死白。真人攝影一定有主光方向、暗位過渡同埋眼神反光；如果指令入面無寫明燈光，模型就會用最平庸嘅全亮白光，令皮膚似足塑膠公仔。以下為你整理 5 款 AI 拍片必學嘅電影級燈光設定，每款均附上 Seedream 5.0 Pro 生成嘅實測範例圖同埋批核要點，幫你將手機片同 AI 口播即刻升呢做高級 Studio 質感。",
    examples: [
      {
        key: "ex-1",
        h: "1. 45 度落地窗自然柔光（日常口播與專業教學首選）",
        alt: "範例 1：45 度落地窗自然柔光打亮主播半邊臉，另一邊呈現自然立體陰影過渡",
        scene:
          "Medium close-up of an adult Hong Kong creator speaking to camera beside a tall diffused apartment window at 45 degrees, soft natural daylight illuminating one cheek with smooth shadow roll-off on the other side, warm neutral apartment wall behind, natural skin texture, no text, no logos",
        p: "45 度窗邊自然柔光係最耐睇、最令人放低戒心嘅口播打光。將大面積柔和日光放喺鏡頭側邊 45 度位，受光面明亮自然，背光面面頰會有柔和嘅立體陰影，令鼻樑同下顎線條即刻出晒嚟，雙眼仲會有清晰嘅長方形眼神光。批核定格時，記住檢查背景牆身要比塊面暗少少，個人先會由畫面跳出嚟。",
      },
      {
        key: "ex-2",
        h: "2. 黃昏逆光金邊（Golden Hour 髮絲輪廓光）",
        alt: "範例 2：黃昏斜陽由後方勾勒出金色髮絲同膊頭邊緣，正面保留柔和補光",
        scene:
          "Medium portrait of an adult host on an outdoor terrace at golden hour sunset, warm low sun behind casting a golden rim light around hair strands and shoulders, soft front bounce light keeping eyes and mouth clear, blurred warm city background, no text, no logos",
        p: "想拍品牌故事、生活感 Vlog 或者戶外穿搭，黃昏逆光金邊（Golden Hour Rim Light）最有電影感。太陽由人物後側方斜射，喺髮絲同膊頭勾出一條溫暖金邊，同時正面一定要加柔和反光補光，確保雙眼同嘴唇清楚唔會黑晒。呢種光影層次令畫面即刻脫離普通室內自拍。",
      },
      {
        key: "ex-3",
        h: "3. 雙色霓虹夜景對比光（香港街頭與科技感 Reels）",
        alt: "範例 3：左邊青藍冷光配右邊暖橙霓虹邊緣光，營造濃厚香港夜景電影感",
        scene:
          "Cinematic medium close-up of an adult creator in a dim studio at night, cool cyan key light from the left and warm amber-magenta neon rim light on the right jawline, wet street bokeh outside window behind, sharp eyes, no text, no logos",
        p: "拍夜間話題、數碼評測、酒吧餐飲或者香港街頭感短片，可以用「一冷一暖」雙色對比光：主光用青藍冷調（Cyan/Teal），側後方邊緣光用暖橙或霓虹洋紅（Amber/Magenta）。冷暖撞色喺 IG 暗黑模式（Dark Mode）下極之搶眼。注意面中間鼻樑同眼周要保持自然膚色，霓虹色只留喺腮骨同膊頭邊位。",
      },
      {
        key: "ex-4",
        h: "4. 咖啡店暖調檯燈氛圍光（高信任感深夜訪談）",
        alt: "範例 4：木質書枱與 2700K 暖色檯燈局部打光，背景書架微暗具故事感",
        scene:
          "Medium shot of an adult founder seated at a warm wooden cafe or study table in the evening, a warm 2700K brass lamp casting cozy golden directional light across the face, dark softly blurred wood shelves behind, natural skin texture, no text, no logos",
        p: "如果你做緊理財分析、創業心得、心理諮詢或者慢活品牌，2700K 暖色檯燈局部光可以營造好強嘅「一對一傾偈」私密感。背景保持低兩格光度，只用一盞暖光集中照亮主持塊面同埋雙手，觀眾滑到嗰陣會自然停低聽你講嘢。檢查定格時確保燈罩唔會遮住下巴或嘴型。",
      },
      {
        key: "ex-5",
        h: "5. 高調商業無影美妝光（護膚、醫美與珠寶特寫）",
        alt: "範例 5：上下夾光（Clamshell）高調柔光棚拍，膚質通透無黑眼圈同時保留真實毛孔",
        scene:
          "High-key studio beauty portrait of an adult presenter in a clean warm-white studio, large diffused overhead softbox and lower white reflector bounce eliminating under-eye shadows, luminous real skin pores and clear eye catchlights, no text, no logos",
        p: "賣護膚品、美容療程、化妝品或者近鏡展示產品，最怕頂光造成深黑眼圈同法令紋。高調上下夾光（Clamshell Light）由上方大柔光箱加下方白色反光板同時補光，令全塊面均勻通透，同時又保留真實皮膚毛孔同光澤，唔會似美顏濾鏡開過龍咁假。",
      },
    ],
    workedExample:
      "一間中環美容院每星期出兩條粵語 Reels。以前普通生成嘅畫面好似證件相咁平；改用「45 度落地窗自然柔光」拍知識口播、再用「高調商業無影美妝光」拍療程前後講解，同一個 AI 主播即刻好似請咗專業燈光師駐場拍片，觀眾留言同埋 DM 查詢率明顯提升。",
    bridge:
      "喺 Scro 你可以用 Seedream 5.0 Pro 直接生成以上 5 款電影級打光嘅主持定格，或者用 Scro Swap 內置嘅 17 款 Studio Relight 一鍵將現成暗沉手機片重新打光，再配地道香港粵語口播同燒入字幕。",
    checks: [
      "雙眼瞳孔有清晰眼神光，方向同主光一致。",
      "皮膚保留真實毛孔同陰影過渡，唔似磨皮塑膠面。",
      "背景同人物之間有清楚光暗或冷暖分離度。",
    ],
  },
  {
    id: 5,
    slug: "5-camera-angles-for-talking-head-reels",
    title: "5 Camera Angles for AI Talking-Head Reels",
    excerpt:
      "See 5 high-retention camera angles for AI talking-head videos—from eye-level close-ups to 45-degree editorial interview frames.",
    locale: "en",
    landingPath: "/talking-head",
    tags: ["Talking Head", "AI Video", "Camera Angles", "Instagram Reels"],
    scene:
      "Behind-the-scenes studio view of an adult host framed at eye level on a cinema camera monitor with a second 45-degree interview camera beside it, warm daylight, no text, no logos",
    cta: "Frame your AI host in Scro",
    answer:
      "Shooting every single talking-head reel from a dead-center webcam angle fatigues repeat viewers within a week. Real video producers switch camera height and horizontal angle to match the psychological role of each sentence: eye-level builds peer trust, a 45-degree off-axis angle feels like an unscripted documentary interview, and an over-the-shoulder desk shot proves hands-on work. Here are five essential camera angles for AI talking-head videos, each illustrated with a Seedream 5.0 Pro reference frame.",
    examples: [
      {
        key: "ex-1",
        h: "1. Eye-Level Medium Close-Up (Direct Peer Connection)",
        alt: "Example 1: Eye-level medium close-up framed from mid-chest to just above the head",
        scene:
          "Eye-level medium close-up of an adult founder looking directly into the camera lens in a sunlit modern office, framed from mid-chest to slightly above the head, warm natural daylight, shallow depth of field, no text, no logos",
        p: "An eye-level medium close-up places the lens at the exact height of the speaker's eyes, cutting just above the sternum. Because the viewer neither looks up nor down at the host, the brain processes the clip as a face-to-face conversation across a table. Use this as your primary A-roll anchor for hooks and direct calls to action, leaving clean headroom in the top fifth of the frame for captions.",
      },
      {
        key: "ex-2",
        h: "2. 45-Degree Editorial Interview Angle (Off-Axis Documentary)",
        alt: "Example 2: Three-quarter 45-degree editorial interview angle looking slightly off-camera toward an unseen interviewer",
        scene:
          "Editorial documentary medium close-up of an adult expert angled 45 degrees off-axis in a warm studio chair, looking slightly past the lens as if answering an off-camera producer, soft key light on the far cheek, 85mm shallow bokeh, no text, no logos",
        p: "Turning the speaker 30 to 45 degrees toward an unseen producer next to the lens instantly triggers the 'podcast or Netflix documentary' heuristic. Viewers stay longer because they feel like they are eavesdropping on a candid answer rather than being pitched an ad. In Scro's Editorial Interview and Dialogue Q&A directors, alternating between this 45-degree angle and a tighter punch-in creates effortless multi-camera pacing.",
      },
      {
        key: "ex-3",
        h: "3. Slight Low-Angle Hero Frame (Confidence & Authority)",
        alt: "Example 3: Subtle low-angle shot from chest height looking slightly up at a confident founder",
        scene:
          "Subtle low-angle medium shot of a confident adult creative director standing in a high-ceiling architectural loft, camera positioned at chest height tilting slightly upward, clean geometric ceiling lines behind, natural daylight, no text, no logos",
        p: "Lowering the camera to chest height and tilting up by just 10 to 15 degrees gives the speaker stature and architectural presence. Use this angle for bold contrarian hooks, launch announcements, or leadership takeaways. Keep the tilt subtle—a 10-degree lift looks heroic, whereas a 45-degree floor angle distorts the chin and nostrils.",
      },
      {
        key: "ex-4",
        h: "4. High-Angle Desk Work & Sketch Overview",
        alt: "Example 4: Elevated 30-degree high-angle view looking down at a creator explaining a physical prototype at a workbench",
        scene:
          "Elevated 30-degree high-angle medium shot of an adult designer seated at a wooden studio workbench holding an unbranded ceramic prototype and looking up toward the lens, warm overhead daylight, tidy tools around, no text, no logos",
        p: "Positioning the camera 30 degrees above eye level looking down at a desk lets the viewer see both the speaker's face and what their hands are holding on the tabletop. Craft businesses, architects, chefs, and product designers use this angle to prove tangible skill in the first three seconds without cutting away from the host.",
      },
      {
        key: "ex-5",
        h: "5. Walk-and-Talk Handheld Street POV",
        alt: "Example 5: Dynamic chest-high walk-and-talk street frame with soft background motion depth",
        scene:
          "Dynamic medium shot of an adult creator walking along a tree-lined city sidewalk at golden hour speaking directly to camera at arm's length, natural daylight, softly blurred street depth behind, authentic lifestyle energy, no text, no logos",
        p: "A walk-and-talk frame places the camera one step ahead of the speaker on a sidewalk or corridor so the background has deep receding perspective lines. Even a five-second walking hook at the start of a reel raises initial retention because both the subject and the environment carry forward momentum.",
      },
    ],
    workedExample:
      "A business coach turns a 45-second script into a three-angle sequence: an Eye-Level Medium Close-Up for the opening hook, a 45-Degree Editorial Interview angle for the core story, and a High-Angle Desk shot for the final takeaway. Viewers watch to the end because the visual perspective refreshes every 12 seconds.",
    bridge:
      "Scro's Talking-Head, Editorial Interview, and Dialogue Q&A directors let you generate and lock these exact camera angles on your character while keeping face and wardrobe 100% consistent.",
    checks: [
      "Eye height matches the intended emotion (level for trust, 45° for interview, slight low for authority).",
      "Headroom leaves space for burned-in captions without covering the forehead.",
      "The speaker's jaw and hairline stay identical when switching angles.",
    ],
  },
  {
    id: 6,
    slug: "5-focal-lengths-that-change-ai-video-hosts",
    title: "5 Lens Focal Lengths for AI Video Hosts",
    excerpt:
      "Compare 24mm, 35mm, 50mm, 85mm, and 100mm macro lenses in AI video—with generated visual examples showing how each changes face and background.",
    locale: "en",
    landingPath: "/ai-influencer",
    tags: ["AI Influencer", "AI Video", "Camera Angles", "Talking Head"],
    scene:
      "Cinema prime lens set resting on a wooden studio table in front of a softly blurred portrait monitor, warm studio light, no text, no logos",
    cta: "Lock your host's lens look in Scro",
    answer:
      "Specifying a lens focal length in millimeters (`24mm`, `35mm`, `50mm`, `85mm`, or `100mm macro`) is one of the highest-leverage prompt controls in AI image and video generation. Focal length simultaneously controls facial proportion, how much of the room fits inside the frame, and how strongly the background blurs into bokeh. Below are the five focal lengths you should know, paired with Seedream 5.0 Pro examples so you can see the exact visual shift before you generate.",
    examples: [
      {
        key: "ex-1",
        h: "1. 24mm Wide Environmental Lens (Room & Action Context)",
        alt: "Example 1: 24mm wide-angle lens showing a creator and the full architectural studio environment",
        scene:
          "24mm wide-angle environmental portrait of an adult ceramic artist standing inside a sunlit pottery studio, full workbench, shelves of unbranded clay vessels, and tall windows visible with deep perspective, natural daylight, no text, no logos",
        p: "A 24mm lens captures the whole room—floor-to-ceiling windows, workbenches, and architectural depth—making the environment a co-star alongside your host. Use 24mm for shop tours, full-body outfit reveals, and studio introductions. Keep the speaker's face near the center of a 24mm frame; placing a face too close to the lens or near the frame edges introduces wide-angle nose distortion.",
      },
      {
        key: "ex-2",
        h: "2. 35mm Documentary Street & Lifestyle Prime",
        alt: "Example 2: 35mm lens balancing a waist-up creator portrait with readable street and cafe context",
        scene:
          "35mm documentary waist-up shot of an adult founder at an outdoor coffee bar, natural perspective showing both expressive facial features and the warm wooden espresso counter surroundings in gentle focus, morning sunlight, no text, no logos",
        p: "The 35mm focal length is the workhorse of documentary filmmakers and lifestyle vloggers. Framed from the waist up, 35mm keeps facial features natural while leaving the background just sharp enough that viewers can tell whether the host is in a bakery, a gym, or a design office without reading a caption.",
      },
      {
        key: "ex-3",
        h: "3. 50mm Standard Human-Eye Portrait",
        alt: "Example 3: 50mm f/1.8 standard portrait matching natural human eye perspective",
        scene:
          "50mm f/1.8 medium close-up portrait of an adult host in a minimalist apartment, zero facial distortion, natural human-eye perspective, softly blurred indoor plants and warm lamp in background, crisp eye catchlights, no text, no logos",
        p: "A 50mm prime matches the field of view and compression of the human eye. There is zero wide-angle exaggeration on the nose and zero telephoto flattening on the cheeks, making 50mm the safest default when locking a new AI influencer's master reference face.",
      },
      {
        key: "ex-4",
        h: "4. 85mm f/1.4 Portrait Telephoto (Creamy Bokeh Compression)",
        alt: "Example 4: 85mm f/1.4 telephoto portrait with flattering facial compression and creamy background bokeh",
        scene:
          "85mm f/1.4 tight portrait of an adult speaker outdoors in a sunlit park, flattering telephoto facial compression, background trees and sunlight melted into creamy circular bokeh balls, razor-sharp eyelashes and skin pores, no text, no logos",
        p: "An 85mm lens compresses perspective—flattering the jawline and cheekbones—and melts a busy background into smooth, painterly bokeh circles. Use 85mm when you want luxurious beauty portraits, emotional storytelling beats, or clean separation in a cluttered outdoor street.",
      },
      {
        key: "ex-5",
        h: "5. 100mm Macro Detail Lens (Hands, Texture & Product B-Roll)",
        alt: "Example 5: 100mm macro close-up capturing fine skin texture and an unbranded dropper pipette",
        scene:
          "100mm macro extreme close-up of adult hands holding a glass pipette dropping clear serum onto skin in warm sunlight, razor-thin depth of field, crystal-clear liquid droplet and fine skin texture, creamy blurred background, no text, no logos",
        p: "When cutting away from your talking head to prove product quality—a watch clasp clicking shut, espresso crema pouring, or a serum droplet touching skin—switch to a 100mm macro prompt. Macro optics isolate a few centimeters of texture in tack-sharp detail while turning everything else into pure color.",
      },
    ],
    workedExample:
      "A coffee roaster builds an AI host workflow: they lock the founder's identity at 50mm, shoot the cafe intro at 35mm so the roaster machine is visible, punch in to 85mm for the tasting notes, and insert a 100mm macro B-roll clip of the espresso pour.",
    bridge:
      "In Scro you can combine 35mm/50mm/85mm A-roll frames with 100mm macro B-roll cutaways inside the Talking + B-Roll director so every reel looks shot on a full prime lens kit.",
    checks: [
      "Wide 24mm shots keep the speaker's face near the center to avoid edge distortion.",
      "85mm portraits keep both eyes on the focal plane so neither eye blurs.",
      "100mm macro B-roll clips show one clear physical detail with zero fake text.",
    ],
  },
  {
    id: 7,
    slug: "5-framing-rules-for-9-16-vertical-reels",
    title: "5 Framing Rules for 9:16 Vertical Reels",
    excerpt:
      "Keep your 9:16 vertical AI reels clean and readable with 5 proven composition rules—illustrated with Seedream visual examples.",
    locale: "en",
    landingPath: "/talking-head",
    tags: ["Instagram Reels", "AI Video", "Talking Head", "Explainer"],
    scene:
      "Clean minimalist architectural portrait of an adult speaker framed in the lower two-thirds with generous uncluttered wall space above for captions, warm daylight, no text, no logos",
    cta: "Compose 9:16 reels with burned-in captions in Scro",
    answer:
      "Vertical 9:16 video is not just a horizontal shot with the sides chopped off—it is a tall column where platform buttons cover the bottom and right edges while captions need a clean home in the upper-middle. If your AI start frame fills the top third with busy shelves, hanging lamps, or the speaker's forehead, your burned-in captions become unreadable. Below are five vertical framing compositions that make both your subject and your captions pop on Reels, TikTok, and Shorts.",
    examples: [
      {
        key: "ex-1",
        h: "1. Upper-Third Negative Space (Caption Safe-Zone Framing)",
        alt: "Example 1: Subject positioned in the lower two-thirds with a clean plaster wall in the upper third for captions",
        scene:
          "Portrait of an adult presenter framed in the lower two-thirds of the composition, smooth warm plaster wall occupying the upper third as clean negative space, soft side window light, no text, no logos",
        p: "Place the speaker's eyes just below the horizontal centerline so the top third of the frame is an uncluttered sky, ceiling, or matte plaster wall. That quiet upper zone lets burned-in hook titles and two-line captions read effortlessly on mute without ever touching the speaker's eyebrows.",
      },
      {
        key: "ex-2",
        h: "2. Center-Locked Wes Anderson Symmetry",
        alt: "Example 2: Dead-center symmetrical composition in a tidy studio with balanced architectural lines",
        scene:
          "Perfectly symmetrical dead-center medium shot of an adult host seated at a minimalist wooden desk, matching warm sconces and balanced shelving on left and right, calm authority, natural color, no text, no logos",
        p: "Dead-center symmetry—where the speaker's nose bridge aligns with the exact vertical center and architectural lines mirror left and right—stops fast scrollers because order contrasts with chaotic feeds. Keep desk props minimal and symmetrical on both sides.",
      },
      {
        key: "ex-3",
        h: "3. Off-Center Rule-of-Thirds (Prop & Gesture Pocket)",
        alt: "Example 3: Speaker positioned on the left third while holding an unbranded product in the open right two-thirds",
        scene:
          "Medium shot of an adult creator positioned slightly left of center in a bright studio while holding up an unbranded ceramic skincare jar in the open right side of the frame, clean background, natural daylight, no text, no logos",
        p: "When your host needs to hold up a product bottle or point at a visual prop, shift their torso slightly toward one vertical third line and open up the opposite side as a dedicated display pocket. That prevents the product from blocking the speaker's mouth during lip-sync.",
      },
      {
        key: "ex-4",
        h: "4. Foreground Depth Blur (Three-Layer Framing)",
        alt: "Example 4: Softly blurred foreground plant leaf and desk edge framing a sharp speaker in the midground",
        scene:
          "Medium portrait of an adult host in a creative studio framed through a softly out-of-focus foreground monstera leaf and wooden table edge, tack-sharp eyes in the midground, softly blurred warm bookshelf in background, no text, no logos",
        p: "Placing an out-of-focus element—a coffee cup rim, a plant leaf, or a doorframe edge—in the lower corner of the foreground creates instant three-layer cinema depth (foreground, sharp subject, blurred background). Make sure the foreground blur stays near the frame edge and never crosses the chin or hands.",
      },
      {
        key: "ex-5",
        h: "5. Clean Table-Edge Anchor for Hand Gestures",
        alt: "Example 5: Waist-up framing anchored by a clean wooden table edge at the bottom fifth of the shot",
        scene:
          "Waist-up medium shot of an adult advisor seated behind a clean oak table occupying the bottom fifth of the frame, expressive natural hands resting on the wood surface, warm daylight, uncluttered wall behind, no text, no logos",
        p: "Floating torso shots sometimes feel weightless when the bottom of the frame cuts awkwardly at the elbows. Anchoring the bottom fifth of the shot with a clean wooden desk or counter surface gives the speaker's hands a natural resting place and keeps gestures grounded.",
      },
    ],
    workedExample:
      "A nutritionist switches from tight forehead-cropping selfies to Upper-Third Negative Space framing anchored by a clean kitchen counter edge. Their burned-in 13-style captions sit in the calm upper wall space without covering their eyes, boosting silent-viewer completion rate.",
    bridge:
      "Scro generates native 9:16 start frames with clean caption headroom and burns in 13 animated subtitle styles positioned inside the multi-platform safe zone.",
    checks: [
      "The top third of the frame is calm enough to read white or yellow captions.",
      "Important props and hands stay clear of the right-edge icon column.",
      "Foreground depth elements never block the speaker's mouth.",
    ],
  },
  {
    id: 8,
    slug: "5-款高留存-ai-口播鏡頭角度範例",
    title: "5 款高留存 AI 口播鏡頭角度範例",
    excerpt:
      "唔想每條 Reels 都似呆板證件相？即睇 5 款高留存 AI 口播鏡頭角度與焦距範例，每款附 Seedream 實測構圖。",
    locale: "zh-Hant",
    landingPath: "/cantonese?hl=zh-Hant",
    tags: ["Cantonese", "Talking Head", "Camera Angles", "Instagram Reels"],
    scene:
      "Editorial behind-the-scenes view of an adult Hong Kong host being filmed from a 45-degree interview angle in a warm studio, camera monitor visible in foreground, no text, no logos",
    cta: "即刻喺 Scro 生成多角度粵語口播",
    answer:
      "點解有啲帳號每條口播片睇落都好似請咗攝影隊拍，而有啲就似對住電話呆板讀稿？關鍵在於「鏡頭角度（Camera Angle）」同埋「焦距構圖」。如果十條片都係正中間大頭貼自拍，觀眾睇兩秒就會滑走。只要根據內容性質切換以下 5 款經典鏡頭角度，配合同一位鎖定面孔嘅 AI 主持，你嘅粵語 Reels 就會即刻有齊訪談感、專業感同生活實況感。",
    examples: [
      {
        key: "ex-1",
        h: "1. 平視中近景（Eye-Level Medium Close-Up 建立信任）",
        alt: "範例 1：鏡頭與雙眼同高嘅平視中近景，上方預留乾淨牆面放粵語字幕",
        scene:
          "Eye-level medium close-up of an adult Hong Kong founder speaking warmly to camera in a sunlit minimalist studio, framed from chest up with clean wall space above the head, natural daylight, no text, no logos",
        p: "鏡頭高度同主持雙眼完全平齊，由胸口上方拍到頭頂再預留少少空間。呢個角度最似同朋友面對面坐低傾偈，最啱用喺開頭頭三秒黃金鉤子（Hook）同埋結尾呼籲行動（CTA）。記住頭頂上方塊牆要夠乾淨，方便放燒入式廣東話字幕而唔會遮住眼眉。",
      },
      {
        key: "ex-2",
        h: "2. 45 度雜誌訪談側拍（Editorial Interview 紀錄片感）",
        alt: "範例 2：45 度微側身訪談角度，視線望向鏡頭旁嘅訪問者，極具專業 Podcast 質感",
        scene:
          "45-degree three-quarter editorial interview shot of an adult Hong Kong professional seated in a warm leather armchair, looking slightly off-axis as if answering a podcast host beside the camera, 85mm shallow depth of field, no text, no logos",
        p: "將主持身體同視線微轉 30 至 45 度，好似對住鏡頭隔籬嘅記者或者 Podcast 拍檔答問題咁。香港觀眾對呢種「側拍訪談鏡」特別受落，因為感覺似偷聽緊專家拆解內幕，而唔係硬銷廣告。用喺中段解釋痛點或者雙人問答（Q&A）效果最好。",
      },
      {
        key: "ex-3",
        h: "3. 35mm 半身帶店舖環境鏡（展示門市與工作空間）",
        alt: "範例 3：35mm 半身構圖，同時清晰見到主播與背後咖啡店／工作室環境",
        scene:
          "35mm waist-up portrait of an adult Hong Kong shop owner standing behind a warm wooden coffee and pastry counter, clear view of both the expressive host and the tidy shop interior behind, morning sunlight, no text, no logos",
        p: "做香港小店、餐廳、美容院或者 Showroom，千祈唔好淨係影塊面。用 35mm 廣角半身構圖，由腰部以上入鏡，觀眾第一眼就同時睇到你嘅產品吧台、裝修格調同埋主持表情，唔使靠口講都已經建立咗實體店嘅真實感。",
      },
      {
        key: "ex-4",
        h: "4. 85mm 淺景深人像特寫（強化情緒與重點金句）",
        alt: "範例 4：85mm 大光圈特寫，背景化為柔和奶油散景，焦點完全鎖死喺眼神同嘴型",
        scene:
          "85mm f/1.4 close portrait of an adult Hong Kong creator outdoors with lush green city park bokeh melted in the background, tack-sharp eyes and natural skin texture, warm golden light, no text, no logos",
        p: "當你講到全條片最重要嗰句金句或者客戶真實轉變時，切換去 85mm 淺景深特寫。85mm 鏡頭會將雜亂背景融化成柔和散景（Bokeh），令五官更立體，觀眾視線 100% 集中喺主持嘅眼神同粵語對嘴嘴型上面。",
      },
      {
        key: "ex-5",
        h: "5. 30 度高角度桌面實測鏡（邊講邊展示實物）",
        alt: "範例 5：由上向下 30 度俯視書枱，同時拍到主持講解與雙手展示產品",
        scene:
          "30-degree elevated high-angle medium shot of an adult Hong Kong creator seated at a tidy wooden workbench holding an unbranded skincare bottle and looking up at the camera, warm daylight, no text, no logos",
        p: "鏡頭升高少少向下傾斜 30 度對住工作枱，可以一鏡過拍晒主持塊面同埋雙手喺枱面試用產品嘅過程。無論係開箱、護膚品試上手定係手作教學，呢個角度都能夠提供最強嘅「眼見為憑」說服力。",
      },
    ],
    workedExample:
      "一位香港理財顧問將一條 40 秒粵語 Reels 分成三鏡：頭 5 秒用「平視中近景」拋出問題，中段 25 秒轉用「45 度雜誌訪談側拍」配「85mm 特寫」拆解數據，最後 10 秒返去「30 度桌面鏡」指住圖表總結。成條片節奏明快，完播率比單一角度高出近一倍。",
    bridge:
      "Scro 內置嘅 Talking-Head、Editorial Interview 同埋 Talking + B-Roll 導演模式，幫你鎖死同一個 AI 主播面孔，自動切換平視、45 度訪談鏡同埋特寫 B-Roll。",
    checks: [
      "切換角度時，主播嘅髮際線、腮骨同服裝保持一致。",
      "平視與半身鏡上方留有足夠空間放廣東話字幕。",
      "桌面實物同背景道具完全無亂碼假字。",
    ],
  },
  {
    id: 9,
    slug: "5-studio-backgrounds-for-ai-talking-head-videos",
    title: "5 Studio Backgrounds for AI Talking Heads",
    excerpt:
      "Explore 5 high-converting studio and lifestyle backgrounds for AI talking-head videos—with Seedream visual examples and scene prompts.",
    locale: "en",
    landingPath: "/app/teleport",
    tags: ["Talking Head", "AI Video", "Teleport", "Instagram Reels"],
    scene:
      "Wide architectural shot of a sunlit minimalist creator studio with oak acoustic slats, a leather armchair, indoor olive tree, and warm floor lamp, no people, no text, no logos",
    cta: "Teleport your video into these studios in Scro",
    answer:
      "The room behind your speaker tells the viewer how much to trust your advice before they hear your second sentence. A cluttered bedroom wall lowers perceived authority, while an overly busy fake office pulls eyes away from the face. Whether you are generating an AI host from scratch or using scene relocation to replace your real room without a green screen, these five studio backgrounds consistently convert across B2B, coaching, wellness, and ecommerce niches.",
    examples: [
      {
        key: "ex-1",
        h: "1. Sunlit Minimalist Founder Study (Oak & Plaster)",
        alt: "Example 1: Sunlit minimalist founder office with limewash plaster walls, warm oak shelving, and an indoor olive tree",
        scene:
          "Medium shot of an adult founder speaking in a sunlit minimalist study, warm limewash plaster wall, tidy oak bookshelf with unbranded neutral books and ceramic vases, soft window daylight from the left, no text, no logos",
        p: "Limewash plaster walls paired with warm oak shelving and a single indoor plant project calm executive authority. Because the color palette stays in warm neutrals (sand, oak, cream), any wardrobe color pops cleanly and white or dark captions remain easy to read. Keep book spines turned or unbranded so no fake titles distract the eye.",
      },
      {
        key: "ex-2",
        h: "2. Warm Acoustic Brick Podcast Studio",
        alt: "Example 2: Professional podcast studio with wooden acoustic slat panels, warm tungsten practicals, and broadcast mic arm",
        scene:
          "Medium close-up of an adult host in a professional podcast studio, vertical walnut acoustic wood slats and dark charcoal foam behind, warm amber LED strip accent light, studio microphone on a boom arm in lower foreground, no text, no logos",
        p: "Vertical walnut acoustic slats and a broadcast boom mic in the lower corner immediately frame your clip as a high-value podcast excerpt. Use this background for two-speaker Q&A reels, industry hot takes, and interview cutdowns. Make sure the microphone capsule sits just below chin level so it never hides the lips.",
      },
      {
        key: "ex-3",
        h: "3. Modern Travertine & Daylight Wellness Vanity",
        alt: "Example 3: Bright travertine stone bathroom and skincare studio with arched mirror and morning daylight",
        scene:
          "Medium shot of an adult skincare creator in a bright minimalist travertine stone bathroom studio, warm morning sunlight, unbranded amber glass bottles neatly arranged on the counter, clean architectural lines, no text, no logos",
        p: "For skincare, dermatologist explainers, haircare, and morning routines, a sunlit travertine stone vanity looks like an editorial beauty shoot rather than a cramped apartment bathroom. Keep mirrors angled so they reflect plain plaster wall rather than a second phantom camera.",
      },
      {
        key: "ex-4",
        h: "4. Architectural Concrete & Glass Creative Loft",
        alt: "Example 4: High-ceiling architectural loft with board-formed concrete, steel crittall windows, and warm daylight",
        scene:
          "Medium portrait of an adult design director in a high-ceiling architectural loft, smooth concrete wall and black steel industrial windows letting in soft daylight, warm leather sofa in background bokeh, no text, no logos",
        p: "Agencies, architects, SaaS builders, and photographers need a space that feels designed. Board-formed concrete softened by black steel industrial windows and a warm leather sofa gives neutral contrast and strong geometric lines that hold up at both 35mm and 85mm focal lengths.",
      },
      {
        key: "ex-5",
        h: "5. Warm Roastery & Retail Counter Bar",
        alt: "Example 5: Warm wood and brushed-steel specialty cafe counter with soft pendant bokeh",
        scene:
          "Medium waist-up shot of an adult business owner standing behind a warm walnut and brushed-steel specialty coffee bar, soft warm pendant lights glowing in the background bokeh, unbranded ceramic cups stacked neatly, no text, no logos",
        p: "Local service brands, hospitality founders, and DTC food & beverage makers convert best when standing behind a real counter rather than sitting at a desk. A walnut bar with soft pendant bokeh feels approachable, grounded, and open for business.",
      },
    ],
    workedExample:
      "A consultant records a 30-second talking head in a spare bedroom with harsh ceiling light, then uses Scro Teleport to relocate the performance into the Sunlit Minimalist Founder Study while keeping their original voice and hand gestures intact.",
    bridge:
      "In Scro you can either generate your AI host directly inside these five studios or use Teleport to drop your own webcam clip into any custom studio plate with one click.",
    checks: [
      "Background props (books, bottles, cups) carry zero invented text or logos.",
      "Mirrors and glass panels do not reflect a phantom camera crew.",
      "Lighting on the speaker's face matches the direction of the studio windows or lamps.",
    ],
  },
  {
    id: 10,
    slug: "5-outdoor-locations-to-teleport-ai-videos",
    title: "5 Outdoor Scenes for AI Video Teleport",
    excerpt:
      "Relocate your talking-head clips into 5 cinematic outdoor locations—from golden hour city streets to glasshouse gardens—with Seedream examples.",
    locale: "en",
    landingPath: "/app/teleport",
    tags: ["Teleport", "AI Video", "Talking Head", "Instagram Reels"],
    scene:
      "Adult creator speaking to camera in a sunlit architectural courtyard with olive trees and limestone arches, shallow depth of field, golden afternoon light, no text, no logos",
    cta: "Teleport your video into an outdoor scene in Scro",
    answer:
      "Filming outdoors in real life means fighting wind noise, passing pedestrians, changing clouds, and permits. With AI scene relocation and reference-to-video generation, you can record clean audio at your desk and place yourself—or your locked AI host—into an outdoor location that matches your brand's mood. The secret to believable outdoor AI video is choosing locations with natural depth perspective and matching the sunlight direction on the speaker's face. Here are five outdoor scenes that elevate vertical reels without looking like a flat green-screen key.",
    examples: [
      {
        key: "ex-1",
        h: "1. Golden Hour Tree-Lined Boulevard",
        alt: "Example 1: Sun-dappled tree-lined city sidewalk at golden hour with warm receding bokeh",
        scene:
          "Medium shot of an adult creator standing on a quiet tree-lined stone sidewalk at golden hour, low afternoon sunlight filtering through leaves as warm bokeh behind, natural rim light on hair, 50mm lens, no text, no logos",
        p: "A tree-lined sidewalk with receding perspective lines gives the frame natural depth from foreground to horizon. Dappled afternoon sun through leaves creates organic circular bokeh that hides background detail while wrapping the speaker's hair in a warm rim light.",
      },
      {
        key: "ex-2",
        h: "2. European Limestone Cafe Terrace",
        alt: "Example 2: Outdoor limestone cafe terrace with woven bistro chairs and morning sunlight",
        scene:
          "Medium close-up of an adult host seated at a small marble table on a sunlit limestone cafe terrace, woven bistro chairs and stone arches softly blurred behind, unbranded porcelain espresso cup on table, no text, no logos",
        p: "Seated terrace shots work seamlessly when relocating a desk-recorded video because your posture—sitting with forearms near a table—already matches a cafe table. Keep street signs and awnings out of frame or completely blank so no garbled lettering appears.",
      },
      {
        key: "ex-3",
        h: "3. Sunlit Botanical Glasshouse Conservatory",
        alt: "Example 3: Iron-and-glass botanical conservatory filled with lush tropical foliage and diffused skylight",
        scene:
          "Medium portrait of an adult wellness creator inside a sunlit Victorian iron-and-glass botanical conservatory, lush green palms and ferns in soft bokeh behind, bright diffused overhead skylight, natural skin tones, no text, no logos",
        p: "A glasshouse conservatory acts like a giant natural softbox: the glass roof diffuses overhead sunlight while deep green foliage provides rich color contrast against warm skin tones. Wellness, sustainability, skincare, and botanical brands use this setting to project freshness year-round.",
      },
      {
        key: "ex-4",
        h: "4. Minimalist Limestone & Olive Courtyard",
        alt: "Example 4: Mediterranean architectural limestone courtyard with warm travertine arches and soft shadows",
        scene:
          "Medium shot of an adult fashion founder standing in a minimalist Mediterranean limestone courtyard, warm travertine arches and an olive tree casting gentle leaf shadows on the stone wall behind, golden daylight, no text, no logos",
        p: "Warm travertine stone arches and subtle leaf shadows create a clean editorial backdrop for fashion, jewelry, homeware, and luxury hospitality reels. Because the stone palette is monochromatic, wardrobe textures and product colors take center stage.",
      },
      {
        key: "ex-5",
        h: "5. Coastal Boardwalk & Overcast Ocean Horizon",
        alt: "Example 5: Calm coastal wooden boardwalk with soft overcast sky and blurred ocean horizon",
        scene:
          "Medium close-up of an adult speaker in a knit sweater on a coastal wooden boardwalk, soft even overcast daylight, calm blue-grey ocean horizon and dunes softly blurred in the distance, natural wind-swept hair detail, no text, no logos",
        p: "Overcast coastal light is nature's easiest match for indoor recordings: because the cloud layer diffuses the sky, there are no harsh nose shadows to mismatch your source clip. The calm horizon line in the background keeps the upper third completely clear for captions.",
      },
    ],
    workedExample:
      "A travel gear founder records a 20-second backpack pitch seated at a desk, then uses Scro Teleport to place the shot onto a European Limestone Cafe Terrace for the hook and a Coastal Boardwalk for the durability test.",
    bridge:
      "Scro Teleport relocates your original person and voice into any uploaded location photo or a freshly generated Seedream 5.0 Pro outdoor plate—no green screen required.",
    checks: [
      "Posture in the source clip (standing vs. seated) matches the outdoor setting.",
      "Sunlight direction on the face matches the sky and shadow angle in the background.",
      "Street backgrounds contain zero unreadable shop signs or license plates.",
    ],
  },
];
