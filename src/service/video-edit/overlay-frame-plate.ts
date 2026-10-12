// Which keyed plate is burned onto a still.
// Talking-head read hands the end still the next clip's line, so the video
// can transition into it. The last clip has no next line, so its end keeps its own.
export function overlayFramePlateUrl(input: {
  handoff: boolean;
  clipNumber: number;
  position: "start" | "end";
  clipNumbers: number[];
  plates: Array<{ clipNumber: number; blobUrl: string }>;
}): string | undefined {
  const own = input.plates.find((plate) => plate.clipNumber === input.clipNumber)?.blobUrl;
  if (input.position === "start" || !input.handoff) return own;
  const next = input.clipNumbers.filter((clipNumber) => clipNumber > input.clipNumber).sort((a, b) => a - b)[0];
  if (!next) return own;
  return input.plates.find((plate) => plate.clipNumber === next)?.blobUrl;
}
