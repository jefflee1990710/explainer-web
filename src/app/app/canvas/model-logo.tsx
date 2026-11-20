// Brand marks for the canvas model list. Files live in public/canvas/model-logos.

export type CanvasModelLogoAsset = {
  src: string;
  alt: string;
};

const MODEL_LOGOS: ReadonlyArray<{
  match: RegExp;
  asset: CanvasModelLogoAsset;
}> = [
  { match: /flux/, asset: { src: "/canvas/model-logos/flux.svg", alt: "FLUX" } },
  { match: /sdxl|stability/, asset: { src: "/canvas/model-logos/stability.png", alt: "Stability AI" } },
  { match: /minimax|hailuo/, asset: { src: "/canvas/model-logos/minimax.svg", alt: "MiniMax" } },
  { match: /qwen/, asset: { src: "/canvas/model-logos/qwen.svg", alt: "Qwen" } },
  { match: /wan/, asset: { src: "/canvas/model-logos/alibaba.svg", alt: "Alibaba" } },
  { match: /ltx/, asset: { src: "/canvas/model-logos/ltx.png", alt: "LTX" } },
  { match: /sam/, asset: { src: "/canvas/model-logos/meta.svg", alt: "Meta" } },
  {
    match: /seedvr|seedream|seedance|bytedance/,
    asset: { src: "/canvas/model-logos/seed.png", alt: "ByteDance Seed" },
  },
  { match: /relayvsr/, asset: { src: "/canvas/model-logos/relayvsr.svg", alt: "RelayVSR" } },
  {
    match: /gemini|nano-banana|google/,
    asset: { src: "/canvas/model-logos/google.svg", alt: "Google" },
  },
  { match: /openai|gpt-5/, asset: { src: "/canvas/model-logos/openai.svg", alt: "OpenAI" } },
  { match: /heygen/, asset: { src: "/canvas/model-logos/heygen-icon.png", alt: "HeyGen" } },
  { match: /alibaba/, asset: { src: "/canvas/model-logos/alibaba.svg", alt: "Alibaba" } },
];

// Resolves the downloaded brand mark for a canvas model, or null when none exists.
export function canvasModelLogo(providerModelId: string): CanvasModelLogoAsset | null {
  const id = providerModelId.toLowerCase();
  return MODEL_LOGOS.find((item) => item.match.test(id))?.asset ?? null;
}

export function CanvasModelLogo({
  providerModelId,
  className = "h-4 w-4",
}: {
  providerModelId: string;
  className?: string;
}) {
  const logo = canvasModelLogo(providerModelId);
  if (!logo) return null;
  return (
    // Brand marks are decorative; the model name sits beside them.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo.src} alt="" className={`shrink-0 object-contain ${className}`} />
  );
}
