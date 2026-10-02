export type MediaProbe = { width: number; height: number; fps: number; durationSec: number; hasAudio: boolean };

// Parse `ffmpeg -i` stderr. fps falls back to 30 when the stream omits it.
export function parseProbe(stderr: string): MediaProbe {
  const duration = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  const size = stderr.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  const fps = stderr.match(/(\d+(?:\.\d+)?) fps/);
  return {
    width: size ? Number(size[1]) : 0,
    height: size ? Number(size[2]) : 0,
    fps: fps ? Number(fps[1]) : 30,
    durationSec: duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : 0,
    hasAudio: /Audio:/.test(stderr),
  };
}
