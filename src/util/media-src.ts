// Shared URL pick for frames, clips, and jobs: Blob first, then the provider CDN.
export function mediaSrc(item?: {
  blobUrl?: string;
  outputUrl?: string;
} | null) {
  return item?.blobUrl || item?.outputUrl || undefined;
}
