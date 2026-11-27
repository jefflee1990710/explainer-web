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
  { match: /sam|muse|^meta\//, asset: { src: "/canvas/model-logos/meta.svg", alt: "Meta" } },
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
  { match: /microsoft/, asset: { src: "/canvas/model-logos/microsoft.svg", alt: "Microsoft" } },
  { match: /recraft/, asset: { src: "/canvas/model-logos/recraft.svg", alt: "Recraft" } },
  { match: /tencent/, asset: { src: "/canvas/model-logos/tencent.svg", alt: "Tencent" } },
  { match: /sourceful|riverflow/, asset: { src: "/canvas/model-logos/sourceful.svg", alt: "Sourceful" } },
  { match: /krea/, asset: { src: "/canvas/model-logos/krea.svg", alt: "Krea" } },
  { match: /grok|x-ai/, asset: { src: "/canvas/model-logos/xai.svg", alt: "xAI" } },
  { match: /mischief|^tbc\//, asset: { src: "/canvas/model-logos/tbc.svg", alt: "TBC" } },
  { match: /runway/, asset: { src: "/canvas/model-logos/runway.svg", alt: "Runway" } },
  { match: /kling|kwaivgi/, asset: { src: "/canvas/model-logos/kling.svg", alt: "Kling" } },
  { match: /birefnet/, asset: { src: "/canvas/model-logos/birefnet.svg", alt: "BiRefNet" } },
  { match: /alibaba/, asset: { src: "/canvas/model-logos/alibaba.svg", alt: "Alibaba" } },
  { match: /elevenlabs|^tts$/, asset: { src: "/canvas/model-logos/tts.png", alt: "Text to speech" } },
  { match: /^talking-head$/, asset: { src: "/canvas/model-logos/talking-head.png", alt: "Talking head" } },
  { match: /^explainer$/, asset: { src: "/canvas/model-logos/explainer.png", alt: "Explainer" } },
  { match: /^explainer-frame$/, asset: { src: "/canvas/model-logos/explainer.png", alt: "Explainer" } },
  { match: /^director-frame$/, asset: { src: "/canvas/model-logos/talking-head.png", alt: "Talking head" } },
  { match: /^swap$/, asset: { src: "/canvas/model-logos/swap.png", alt: "Character swap" } },
  { match: /^swap-render$/, asset: { src: "/canvas/model-logos/swap.png", alt: "Character swap" } },
  { match: /^teleport$/, asset: { src: "/canvas/model-logos/teleport.png", alt: "Scene teleport" } },
  { match: /^teleport-render$/, asset: { src: "/canvas/model-logos/teleport.png", alt: "Scene teleport" } },
  { match: /^life$/, asset: { src: "/canvas/model-logos/life.png", alt: "Life photos" } },
  { match: /^poster$/, asset: { src: "/canvas/model-logos/poster.png", alt: "Poster" } },
  { match: /^style-transfer$/, asset: { src: "/canvas/model-logos/style-transfer.svg", alt: "Style transfer" } },
  { match: /^concat$/, asset: { src: "/canvas/model-logos/concat.png", alt: "Merge clips" } },
  { match: /^audio-mux$/, asset: { src: "/canvas/model-logos/audio-mux.png", alt: "Audio mix" } },
  { match: /^trim-speed$/, asset: { src: "/canvas/model-logos/trim.png", alt: "Trim and speed" } },
  { match: /^transform$/, asset: { src: "/canvas/model-logos/transform.png", alt: "Color and ratio" } },
  { match: /^extract-audio$/, asset: { src: "/canvas/model-logos/extract-audio.png", alt: "Extract audio" } },
  { match: /^color-grade$/, asset: { src: "/canvas/model-logos/color-grade.png", alt: "Color grade" } },
  { match: /^smooth-silence$/, asset: { src: "/canvas/model-logos/smooth-silence.png", alt: "Smooth silence" } },
  { match: /^keep-ranges$/, asset: { src: "/canvas/model-logos/keep-ranges.png", alt: "Keep ranges" } },
  { match: /^volume$/, asset: { src: "/canvas/model-logos/volume.png", alt: "Volume" } },
  { match: /^audio-fade$/, asset: { src: "/canvas/model-logos/audio-fade.png", alt: "Audio fade" } },
  { match: /^fade$/, asset: { src: "/canvas/model-logos/fade.png", alt: "Fade" } },
  { match: /^crop$/, asset: { src: "/canvas/model-logos/crop.png", alt: "Crop" } },
  { match: /^rotate$/, asset: { src: "/canvas/model-logos/rotate.png", alt: "Rotate" } },
  { match: /^overlay$/, asset: { src: "/canvas/model-logos/overlay.png", alt: "Overlay" } },
  { match: /^image-to-video$/, asset: { src: "/canvas/model-logos/image-to-video.png", alt: "Image to video" } },
  { match: /^frame-grab$/, asset: { src: "/canvas/model-logos/frame-grab.png", alt: "Frame grab" } },
  { match: /^burn-subtitles$/, asset: { src: "/canvas/model-logos/burn-subtitles.png", alt: "Burn subtitles" } },
  { match: /^split$/, asset: { src: "/canvas/model-logos/split.png", alt: "Split" } },
  { match: /^text$/, asset: { src: "/canvas/model-logos/text.png", alt: "Text" } },
  { match: /^audio-mix$/, asset: { src: "/canvas/model-logos/audio-mix.png", alt: "Background music" } },
  { match: /^audio-trim$/, asset: { src: "/canvas/model-logos/audio-trim.png", alt: "Audio trim" } },
  { match: /^audio-concat$/, asset: { src: "/canvas/model-logos/audio-concat.png", alt: "Audio join" } },
  { match: /^adjust$/, asset: { src: "/canvas/model-logos/adjust.png", alt: "Adjust" } },
  { match: /^freeze$/, asset: { src: "/canvas/model-logos/freeze.png", alt: "Freeze frame" } },
  { match: /^export$/, asset: { src: "/canvas/model-logos/export.png", alt: "Export" } },
  { match: /^sequence$/, asset: { src: "/canvas/model-logos/sequence.png", alt: "Sequence timeline" } },
  { match: /^scribe/, asset: { src: "/canvas/model-logos/auto-captions.png", alt: "Auto captions" } },
  {
    match: /^video-style-transfer$/,
    asset: { src: "/canvas/model-logos/color-grade.png", alt: "Video style transfer" },
  },
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
