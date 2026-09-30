// Cache-bust a just-written Blob URL so a first-paint 404 can retry.
export function mediaRetrySrc(src: string, attempt: number) {
  if (attempt <= 0) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}retry=${attempt}`;
}
