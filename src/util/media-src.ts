// Shared URL pick for frames, clips, and jobs: Blob first, then the provider CDN.
export function mediaSrc(item?: {
  blobUrl?: string;
  outputUrl?: string;
} | null) {
  return item?.blobUrl || item?.outputUrl || undefined;
}

// Same file path is overwritten when a job is retried, and the browser keeps
// the previous bytes until a full reload. Tie the displayed URL to the claim
// time so a finished redraw actually swaps the picture.
export function displayMediaSrc(item?: {
  blobUrl?: string;
  outputUrl?: string;
  submittedAt?: string;
  mergedUrl?: string;
  mergedAt?: string;
} | null) {
  // A still with the subtitle burned on is what the studio shows.
  const src = item?.mergedUrl || mediaSrc(item);
  const version = item?.mergedUrl ? item.mergedAt || item.submittedAt : item?.submittedAt;
  if (!src || !version) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}v=${encodeURIComponent(version)}`;
}
