const AUDIO_FORMAT = "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo";

// Join storyboard clips into one main stream. Audio only when every clip has it.
export function buildClipConcatFilter(count: number, hasAudio: boolean) {
  if (count < 2) return "";
  const parts: string[] = [];
  const pads: string[] = [];
  for (let i = 0; i < count; i += 1) {
    parts.push(`[${i}:v]setsar=1,format=yuv420p[v${i}]`);
    if (hasAudio) parts.push(`[${i}:a]${AUDIO_FORMAT}[a${i}]`);
    pads.push(`[v${i}]`);
    if (hasAudio) pads.push(`[a${i}]`);
  }
  parts.push(
    `${pads.join("")}concat=n=${count}:v=1:a=${hasAudio ? 1 : 0}${hasAudio ? "[v][a]" : "[v]"}`,
  );
  return parts.join(";");
}
