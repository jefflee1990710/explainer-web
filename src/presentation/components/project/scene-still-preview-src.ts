// Keep the last still on screen while a redraw is queued or running.
export function previewSrcWhileBusy(
  liveSrc: string | undefined,
  heldSrc: string | undefined,
  busy: boolean,
) {
  if (liveSrc) return liveSrc;
  if (busy) return heldSrc;
  return undefined;
}
