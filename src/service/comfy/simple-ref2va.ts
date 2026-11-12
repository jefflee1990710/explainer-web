// `/app/simple` is the only storyboard path that renders on Vast MiniMax H3 ref2va.
// Every other director stays on OpenRouter `minimax/hailuo-3`.

export const SIMPLE_VIDEO_ENGINE = "comfy-ref2va" as const;
export const SIMPLE_VIDEO_HOOK = "Direct simple video clip";
export const COMFY_H3_REF2VA_VIDEO_MODEL = "comfy/minimax-h3-ref2va";

// Start frame and optional end frame are separate guides. These are the extra stills.
export const MAX_SIMPLE_REF2VA_STILLS = 4;

export function usesSimpleRef2Va(project: {
  videoEngine?: string;
  phaseA?: { hookStrategy?: string } | null;
}): boolean {
  return (
    project.videoEngine === SIMPLE_VIDEO_ENGINE ||
    project.phaseA?.hookStrategy === SIMPLE_VIDEO_HOOK
  );
}

export type SimpleRef2VaStill = { url: string; note: string };

// Character blueprints first, then the studio reference stills. Skip the frames already used as guides.
export function simpleRef2VaReferences(input: {
  characterImageUrls?: string[];
  referenceImages?: Array<{ url: string; description?: string }>;
  startImageUrl?: string;
  endImageUrl?: string;
}): SimpleRef2VaStill[] {
  const skip = new Set(
    [input.startImageUrl, input.endImageUrl]
      .map((url) => url?.trim())
      .filter((url): url is string => Boolean(url)),
  );
  const out: SimpleRef2VaStill[] = [];
  const push = (url: string | undefined, note: string) => {
    const clean = url?.trim();
    if (!clean || !clean.startsWith("https://") || skip.has(clean)) return;
    if (out.some((item) => item.url === clean)) return;
    if (out.length >= MAX_SIMPLE_REF2VA_STILLS) return;
    out.push({ url: clean, note });
  };
  for (const url of input.characterImageUrls || []) {
    push(url, "the character identity and wardrobe reference");
  }
  for (const image of input.referenceImages || []) {
    const description = image.description?.replace(/\s+/g, " ").trim();
    push(
      image.url,
      description
        ? `a scene or subject reference (${description})`
        : "a scene or subject reference",
    );
  }
  return out;
}
