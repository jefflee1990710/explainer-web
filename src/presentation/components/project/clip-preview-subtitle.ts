// The keyed plate is drawn on a finished scene still. It stays off the video
// slot while the start and end frames are still generating, so the words are
// not shown as their own image.
export function previewSubtitleSrc(input: {
  subtitleOverlay: boolean;
  baked: boolean;
  posterHasSubtitle: boolean;
  posterSrc?: string;
  plateStatus?: string;
  plateUrl?: string;
}) {
  if (!input.posterSrc) return undefined;
  if (!input.subtitleOverlay || input.baked || input.posterHasSubtitle) return undefined;
  if (input.plateStatus !== "completed" || !input.plateUrl) return undefined;
  return input.plateUrl;
}
