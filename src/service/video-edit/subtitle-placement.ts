const PLATE_WIDTH = 0.78;
const VERTICAL_CENTER = 0.62;
const BOTTOM_INSET = 0.08;
const FADE_SEC = 0.4;

function num(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

export function subtitlePlacement(
  aspect: "9:16" | "16:9" | "1:1",
  frameW: number,
  frameH: number,
) {
  const w = Math.round(frameW * PLATE_WIDTH);
  const x = "(main_w-overlay_w)/2";
  if (aspect === "16:9") {
    const inset = Math.round(frameH * BOTTOM_INSET);
    return { x, y: `main_h-overlay_h-${inset}`, w };
  }
  const center = Math.round(frameH * VERTICAL_CENTER);
  return { x, y: `${center}-(overlay_h/2)`, w };
}

export function buildSubtitleOverlayFilter(input: {
  count: number;
  hasAudio: boolean;
  durations: number[];
  aspect: "9:16" | "16:9" | "1:1";
  width: number;
  height: number;
}) {
  const place = subtitlePlacement(input.aspect, input.width, input.height);
  const parts: string[] = [];
  for (let i = 0; i < input.count; i += 1) {
    const duration = input.durations[i] ?? 5;
    const fadeOut = Math.max(0, duration - FADE_SEC);
    const plate = input.count + i;
    parts.push(
      `[${plate}:v]scale=${place.w}:-1,format=rgba,fade=t=in:st=0:d=${num(FADE_SEC)}:alpha=1,fade=t=out:st=${num(fadeOut)}:d=${num(FADE_SEC)}:alpha=1[p${i}]`,
    );
    parts.push(`[${i}:v][p${i}]overlay=x=${place.x}:y=${place.y}:format=auto[b${i}]`);
  }
  return parts.join(";");
}
