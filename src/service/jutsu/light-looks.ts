export type JutsuLightLook = {
  id: string;
  nameEn: string;
  nameZhHant: string;
  image: string;
  light: string;
};

// All 17 cinematic relight looks ported from Openjutsu, with Traditional Chinese labels.
export const JUTSU_LIGHT_LOOKS: readonly JutsuLightLook[] = [
  {
    id: "cold_beam",
    nameEn: "Cold beam",
    nameZhHant: "冷白頂光光束",
    image: "/relight/cold_beam.webp",
    light:
      "Light the new photo as a dark horror scene: a single narrow cold white spotlight shines straight down from directly above, with a visible beam of light cutting through dusty air above the head; it lights the top of the hair, forehead, cheekbones, nose and shoulders, leaves deep shadows in the eye sockets and under the nose and chin, and the background falls to black. Cold, desaturated blue-grey colour grade.",
  },
  {
    id: "golden_halo",
    nameEn: "Golden halo",
    nameZhHant: "暖金神聖逆光",
    image: "/relight/golden_halo.webp",
    light:
      "Light the new photo with a warm golden glow: a strong amber backlight behind the head turns the background into glowing orange-gold haze and puts a bright golden rim on the hair and shoulders, while soft warm gold light falls on the face from the front. Rich honey and orange tones, glowing highlights, warm shadows, like sunset in a cathedral.",
  },
  {
    id: "red_blue_gels",
    nameEn: "Red and blue gels",
    nameZhHant: "紅藍雙色霓虹燈膜",
    image: "/relight/red_blue_gels.webp",
    light:
      "Light the new photo with two coloured gel lights in a dark room: saturated red light from the left and deep electric blue light from the right, each colour wrapping around its side of the face, hair and body, purple where they meet, and a dark red-blue background. High-contrast cinematic colour.",
  },
  {
    id: "magenta_club",
    nameEn: "Magenta club",
    nameZhHant: "紫紅夜店迷霧光",
    image: "/relight/magenta_club.webp",
    light:
      "Light the new photo as a night club scene: the face, hair, skin and clothes are washed in hot magenta and purple stage light from above and the left, with pink highlights and deep violet shadows on the person, pink haze in the air and a blurry purple background with sparkling lights.",
  },
  {
    id: "teal_lasers",
    nameEn: "Teal lasers",
    nameZhHant: "青藍雷射光束",
    image: "/relight/teal_lasers.webp",
    light:
      "Light the new photo as a dark club scene in teal and blue: the face, hair, skin and clothes are lit by cold cyan light from the side, with blue-tinted skin, cyan highlights and deep navy shadows on the person; thin bright cyan laser beams cut diagonally through the haze behind, and the background is dark blue-black.",
  },
  {
    id: "toxic_green",
    nameEn: "Toxic green",
    nameZhHant: "螢光毒綠光影",
    image: "/relight/toxic_green.webp",
    light:
      "Light the new photo with eerie toxic green light: a vivid green light from below and the side lights the face, hair and clothes, green laser beams shine through dark haze behind, deep green-black shadows, the whole scene tinted acid green.",
  },
  {
    id: "lime_purple",
    nameEn: "Lime and purple",
    nameZhHant: "青檸與深紫撞色光",
    image: "/relight/lime_purple.webp",
    light:
      "Light the new photo with two bold gel colours: acid yellow-lime light from the front left floods the face and hair, deep purple light fills the shadows on the right and the background, high saturation and strong contrast, like a music video.",
  },
  {
    id: "cyan_orb",
    nameEn: "Cyan orb",
    nameZhHant: "冰藍懸浮光球",
    image: "/relight/cyan_orb.webp",
    light:
      "Light the new photo as a dark, moody scene lit only by a small glowing cold-blue light orb floating close to the face on the right side of the frame; the person is in darkness except where the orb's cool cyan-white light falls on the near side of the face, falling off quickly into blue-black shadow, with blue highlights in the eyes. No other light in the scene.",
  },
  {
    id: "red_room",
    nameEn: "Red room",
    nameZhHant: "暗紅沖印室光效",
    image: "/relight/red_room.webp",
    light:
      "Light the new photo with deep crimson red light filling the whole scene, dark red shadows and a red-black background, and one small bright white light at the left edge of the frame that puts a cold white highlight on the near cheek and in the eyes.",
  },
  {
    id: "blinds",
    nameEn: "Venetian blinds",
    nameZhHant: "百葉窗黑色電影光影",
    image: "/relight/blinds.webp",
    light:
      "Light the new photo as a film noir scene: hard low afternoon sunlight comes through venetian blinds from the left and casts sharp parallel diagonal stripes of bright light and black shadow across the face, hair, neck, clothes and the wall behind; thin rays of light are visible in the smoky air, the rest of the room is dark. Warm amber highlights, deep black shadows, high contrast.",
  },
  {
    id: "phone_glow",
    nameEn: "Phone glow",
    nameZhHant: "暗夜手機螢幕冷光",
    image: "/relight/phone_glow.webp",
    light:
      "Light the new photo as a dark room at night lit only by a phone screen held just below the face; its cold blue-white light falls on the chin, lips, nose and cheeks from below, reflects as small bright squares in the eyes, and fades to black on the hair, shoulders and body, with a pitch-black background. Cold blue tones, everything outside the screen light in darkness.",
  },
  {
    id: "firelight",
    nameEn: "Firelight",
    nameZhHant: "營火暖橙火光",
    image: "/relight/firelight.webp",
    light:
      "Light the new photo as a night scene beside a campfire just outside the frame at the bottom left; flickering orange-red firelight lights the face, hair and clothes from below and the left, glowing embers and sparks float up through the dark air, the far side of the face falls into deep shadow and the background is black night. Hot orange and red tones against darkness.",
  },
  {
    id: "sunset_window",
    nameEn: "Sunset window",
    nameZhHant: "黃昏斜陽窗影",
    image: "/relight/sunset_window.webp",
    light:
      "Light the new photo as a dim room at golden hour: low orange sunlight through a window on the left falls as a hard warm patch across one side of the face, hair and shoulder, with the window-frame shadow cutting across the body; the other side of the face is in deep brown shadow and the room behind is dark. Rich orange highlights, dark warm shadows.",
  },
  {
    id: "evening_lamp",
    nameEn: "Evening lamp",
    nameZhHant: "深夜暖調桌燈",
    image: "/relight/evening_lamp.webp",
    light:
      "Light the new photo as a room in the evening lit only by a table lamp just out of frame on the right at shoulder height: soft warm orange light falls on that side of the face, hair and body, the other side fades into dim brown shadow, and the room behind is dark and cosy with no daylight. Warm amber tones, low brightness, intimate night-time mood.",
  },
  {
    id: "rim_backlight",
    nameEn: "Rim backlight",
    nameZhHant: "高反差輪廓背光",
    image: "/relight/rim_backlight.webp",
    light:
      "Light the new photo with one hard light directly behind the person and slightly above: it draws a thin bright white rim along the hair, the edges of the face, the shoulders and the arms, light glows through loose strands of hair, the front of the face and body stay in deep shadow with only a faint fill, and the background is dark. High-contrast cinematic silhouette lighting.",
  },
  {
    id: "blue_night",
    nameEn: "Blue night",
    nameZhHant: "靜謐深藍夜色",
    image: "/relight/blue_night.webp",
    light:
      "Light the new photo as a room at night lit by soft cool light from the left side: dim blue-violet light falls on the near side of the face, hair and clothes, the other side sinks into deep blue-black shadow, and the background is dark navy. Low brightness, quiet futuristic night mood, cool blue and purple tones.",
  },
  {
    id: "camera_flash",
    nameEn: "Camera flash",
    nameZhHant: "底片機直打閃光燈",
    image: "/relight/camera_flash.webp",
    light:
      "Light the new photo with a direct on-camera flash at night: hard flat white light straight from the camera hits the face and body brightly, gives the skin a slight glossy shine, small bright catchlights in the eyes, a hard dark shadow just behind the person on the wall, and the background falls off quickly into darkness. Candid party-photo look, high contrast.",
  },
] as const;

export const JUTSU_FRAME_RELIGHT_PROMPT =
  "Relight this photograph. Keep the person, face, identity, expression, pose, hair, clothing, framing and setting exactly as they are; change only the lighting and the colour of the light. {look}";

// Image 1 = character donor, image 2 = source frame: identity + outfit from 1, pose + scene from 2.
const JUTSU_CHARACTER_IDENTITY_LOCK =
  "The face must be the same person as attached image 1: keep the face shape, jawline, eye shape, nose, lips, skin tone, and all facial features of attached image 1 exactly, plus its hair and clothing. Wardrobe lock: copy the exact outfit from attached image 1 (every garment, neckline, sleeve length, fabric texture, color, pattern, and chest graphic/logo if present) — never copy or blend any clothing from the person in attached image 2. From attached image 2 take only the mood of the expression (mouth open or closed, eyebrow raise, gaze direction) and apply it to that unchanged face; never copy the face shape or features of the person in attached image 2.";

const JUTSU_CHARACTER_SCENE_LOCK =
  "Keep the exact room, furniture, props, on-screen text, and background of attached image 2 — never replace them with the backdrop from attached image 1.";

export function withCharacterOutfitLock(
  basePrompt: string,
  outfitSpec?: string | null,
  donorLabel = "attached image 1",
): string {
  const cleanOutfit = (outfitSpec || "").trim();
  if (!cleanOutfit) return basePrompt;
  return `${basePrompt} Exact character outfit to wear (from ${donorLabel}): ${cleanOutfit}.`;
}

export function buildCharacterPreparePromptWithRefs(
  referenceImageCount = 1,
  relightLook?: string | null,
  keepSourceOutfit = false,
): { prompt: string; donorLabel: string } {
  const count = Math.max(1, Math.floor(referenceImageCount));
  const donorLabel =
    count === 1 ? "attached image 1" : `attached images 1 to ${count}`;
  const sourceLabel = `attached image ${count + 1}`;
  const identityLock = keepSourceOutfit
    ? `The face and hair must be the same person as ${donorLabel}: keep the exact face shape, jawline, eye shape, nose, lips, skin tone, facial features, and hairstyle of ${donorLabel}, while strictly keeping the ORIGINAL clothing and outfit worn by the person in ${sourceLabel} (do NOT copy any clothing from ${donorLabel}). From ${sourceLabel} keep the exact outfit, pose, and mood of the expression.`
    : count === 1
      ? `The face must be the same person as ${donorLabel}: keep the face shape, jawline, eye shape, nose, lips, skin tone, and all facial features of ${donorLabel} exactly, plus its hair and clothing. Wardrobe lock: copy the exact outfit from ${donorLabel} (every garment, neckline, sleeve length, fabric texture, color, pattern, and chest graphic/logo if present) — never copy or blend any clothing from the person in ${sourceLabel}. From ${sourceLabel} take only the mood of the expression (mouth open or closed, eyebrow raise, gaze direction) and apply it to that unchanged face; never copy the face shape or features of the person in ${sourceLabel}.`
      : `All of ${donorLabel} show the same target character from multiple angles/views: keep the exact face shape, jawline, eye shape, nose, lips, skin tone, facial features, hair, and clothing shown across ${donorLabel}. Wardrobe lock: copy the exact outfit from ${donorLabel} (every garment, neckline, sleeve length, fabric texture, color, pattern, and chest graphic/logo if present) — never copy or blend any clothing from the person in ${sourceLabel}. From ${sourceLabel} take only the mood of the expression (mouth open or closed, eyebrow raise, gaze direction) and apply it to that unchanged face; never copy the face shape or features of the person in ${sourceLabel}.`;
  const sceneLock = `Keep the exact room, furniture, props, on-screen text, and background of ${sourceLabel} — never replace them with the backdrop from ${donorLabel}.`;

  if (relightLook?.trim()) {
    return {
      donorLabel,
      prompt: `Create a photograph of the person from ${donorLabel} in exactly the pose, head angle, hand and arm positions, camera angle, framing and body cut of the person in ${sourceLabel}; describe that pose fully. ${identityLock} ${sceneLock} ${relightLook.trim()}`,
    };
  }
  return {
    donorLabel,
    prompt: `Create a photograph of the person from ${donorLabel} in the exact pose, head angle, hand and arm positions, camera angle, and body cut of the person in ${sourceLabel}. ${identityLock} ${sceneLock}`,
  };
}

export const JUTSU_CHARACTER_RELIGHT_PROMPT = `Create a photograph of the person from attached image 1 in exactly the pose, head angle, hand and arm positions, camera angle, framing and body cut of the person in attached image 2; describe that pose fully. ${JUTSU_CHARACTER_IDENTITY_LOCK} ${JUTSU_CHARACTER_SCENE_LOCK} {look}`;

export const JUTSU_CHARACTER_PREPARE_PROMPT = `Create a photograph of the person from attached image 1 in the exact pose, head angle, hand and arm positions, camera angle, and body cut of the person in attached image 2. ${JUTSU_CHARACTER_IDENTITY_LOCK} ${JUTSU_CHARACTER_SCENE_LOCK}`;

export function findJutsuLightLook(id?: string | null): JutsuLightLook | undefined {
  if (!id) return undefined;
  return JUTSU_LIGHT_LOOKS.find((item) => item.id === id);
}

export function resolveJutsuLightText(
  relightId?: string | null,
  customLightPrompt?: string | null,
): string {
  const custom = (customLightPrompt || "").trim();
  if (custom) return custom;
  const preset = findJutsuLightLook(relightId);
  return preset ? preset.light : "";
}
