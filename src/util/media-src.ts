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
} | null) {
  const src = mediaSrc(item);
  if (!src || !item?.submittedAt) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}v=${encodeURIComponent(item.submittedAt)}`;
}
