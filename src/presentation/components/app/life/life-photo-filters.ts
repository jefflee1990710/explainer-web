// Client-side photo filters for Life shots. Pure pixel maths so the canvas preview and the exported file match.

type Rgb = [number, number, number];

export type LifePhotoFilter = {
  id: string;
  label: string;
  group: "basic" | "bw" | "film";
  mono?: boolean;
  // 1 = unchanged.
  saturation?: number;
  contrast?: number;
  // Added to every channel (0..1 scale).
  brightness?: number;
  // -1 cool .. 1 warm.
  warmth?: number;
  // -1 magenta .. 1 green.
  tint?: number;
  // Colour added to dark / bright areas (0..1 scale per channel).
  shadows?: Rgb;
  highlights?: Rgb;
  // Lifted blacks, 0..0.3.
  fade?: number;
  // Luma noise strength, 0..0.15.
  grain?: number;
  // Corner darkening, 0..1.
  vignette?: number;
};

export const LIFE_PHOTO_FILTERS: readonly LifePhotoFilter[] = [
  { id: "original", label: "原圖", group: "basic" },
  { id: "bw", label: "黑白", group: "bw", mono: true, contrast: 1.05 },
  { id: "hp5", label: "Ilford HP5", group: "bw", mono: true, contrast: 1.25, grain: 0.08, vignette: 0.25 },
  { id: "bw-soft", label: "柔和黑白", group: "bw", mono: true, contrast: 0.9, fade: 0.08 },
  {
    id: "sepia",
    label: "復古棕褐",
    group: "bw",
    mono: true,
    contrast: 0.95,
    shadows: [0.04, 0.01, -0.03],
    highlights: [0.08, 0.03, -0.06],
    fade: 0.04,
  },
  {
    id: "gold200",
    label: "Kodak Gold 200",
    group: "film",
    saturation: 1.1,
    warmth: 0.5,
    contrast: 1.05,
    highlights: [0.04, 0.02, -0.04],
    grain: 0.04,
  },
  {
    id: "portra400",
    label: "Kodak Portra 400",
    group: "film",
    saturation: 0.9,
    warmth: 0.25,
    contrast: 0.92,
    fade: 0.04,
    highlights: [0.03, 0.015, 0],
    grain: 0.03,
  },
  { id: "ektar", label: "Kodak Ektar 100", group: "film", saturation: 1.3, contrast: 1.12, warmth: 0.1 },
  {
    id: "superia",
    label: "Fuji Superia 400",
    group: "film",
    saturation: 1.05,
    tint: 0.4,
    contrast: 1.05,
    shadows: [-0.02, 0.03, 0.03],
    grain: 0.05,
  },
  {
    id: "pro400h",
    label: "Fuji Pro 400H",
    group: "film",
    saturation: 0.85,
    contrast: 0.95,
    fade: 0.06,
    shadows: [-0.01, 0.02, 0.04],
    highlights: [0, 0.01, 0.02],
  },
  {
    id: "cinestill",
    label: "CineStill 800T",
    group: "film",
    warmth: -0.6,
    contrast: 1.08,
    shadows: [-0.02, 0.02, 0.06],
    highlights: [0.06, 0.01, -0.02],
    grain: 0.07,
  },
  { id: "ektachrome", label: "Ektachrome E100", group: "film", saturation: 1.2, warmth: -0.2, contrast: 1.15 },
  {
    id: "polaroid",
    label: "寶麗來",
    group: "film",
    saturation: 0.85,
    contrast: 0.9,
    warmth: 0.3,
    fade: 0.12,
    highlights: [0.03, 0.03, -0.01],
    vignette: 0.3,
  },
  { id: "lomo", label: "LOMO", group: "film", saturation: 1.35, contrast: 1.25, vignette: 0.6 },
  {
    id: "disposable",
    label: "即可拍",
    group: "film",
    saturation: 1.1,
    warmth: 0.3,
    tint: 0.15,
    contrast: 1.1,
    fade: 0.05,
    grain: 0.1,
    vignette: 0.35,
  },
];

export function lifePhotoFilterById(id: string): LifePhotoFilter {
  return LIFE_PHOTO_FILTERS.find((filter) => filter.id === id) ?? LIFE_PHOTO_FILTERS[0];
}

// Small seeded RNG so grain is identical every time the same image is filtered.
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function luma(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Filters RGBA pixels in place. intensity 0 = original, 1 = full filter.
export function applyLifePhotoFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  filter: LifePhotoFilter,
  intensity: number,
) {
  const k = Math.min(1, Math.max(0, intensity));
  if (filter.id === "original" || k === 0) return;
  const saturation = filter.saturation ?? 1;
  const contrast = filter.contrast ?? 1;
  const brightness = filter.brightness ?? 0;
  const warmth = (filter.warmth ?? 0) * 0.08;
  const tint = (filter.tint ?? 0) * 0.05;
  const shadows = filter.shadows ?? [0, 0, 0];
  const highlights = filter.highlights ?? [0, 0, 0];
  const fade = filter.fade ?? 0;
  const grain = filter.grain ?? 0;
  const vignette = filter.vignette ?? 0;
  const random = mulberry32(width * 73856093 + height * 19349663);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const maxDist = Math.hypot(cx, cy) || 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r0 = data[i] / 255;
      const g0 = data[i + 1] / 255;
      const b0 = data[i + 2] / 255;
      let r = r0;
      let g = g0;
      let b = b0;

      const l = luma(r, g, b);
      if (filter.mono) {
        r = l;
        g = l;
        b = l;
      } else if (saturation !== 1) {
        r = l + (r - l) * saturation;
        g = l + (g - l) * saturation;
        b = l + (b - l) * saturation;
      }

      r += warmth;
      b -= warmth;
      g += tint;

      r = (r - 0.5) * contrast + 0.5 + brightness;
      g = (g - 0.5) * contrast + 0.5 + brightness;
      b = (b - 0.5) * contrast + 0.5 + brightness;

      const tone = Math.min(1, Math.max(0, luma(r, g, b)));
      r += shadows[0] * (1 - tone) + highlights[0] * tone;
      g += shadows[1] * (1 - tone) + highlights[1] * tone;
      b += shadows[2] * (1 - tone) + highlights[2] * tone;

      if (fade) {
        r = fade + r * (1 - fade);
        g = fade + g * (1 - fade);
        b = fade + b * (1 - fade);
      }

      if (vignette) {
        const d = Math.hypot(x - cx, y - cy) / maxDist;
        const edge = Math.min(1, Math.max(0, (d - 0.45) / 0.55));
        const falloff = 1 - vignette * edge * edge * 0.8;
        r *= falloff;
        g *= falloff;
        b *= falloff;
      }

      if (grain) {
        const noise = (random() - 0.5) * grain;
        r += noise;
        g += noise;
        b += noise;
      }

      data[i] = (r0 + (r - r0) * k) * 255;
      data[i + 1] = (g0 + (g - g0) * k) * 255;
      data[i + 2] = (b0 + (b - b0) * k) * 255;
    }
  }
}
