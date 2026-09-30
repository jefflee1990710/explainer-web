export const MAX_CHARACTER_REFERENCES = 6;

// FormData may repeat `referenceImageUrl`; keep order, skip blanks/dupes.
export function parseReferenceImageUrls(formData: FormData) {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const value of formData.getAll("referenceImageUrl")) {
    const url = String(value || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= MAX_CHARACTER_REFERENCES) break;
  }
  return urls;
}

// New versions store an array; older rows only have the first URL.
export function characterReferenceUrls(version: {
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
}) {
  const listed = (version.referenceImageUrls || [])
    .map((url) => url.trim())
    .filter(Boolean);
  if (listed.length) return listed.slice(0, MAX_CHARACTER_REFERENCES);
  return version.referenceImageUrl ? [version.referenceImageUrl] : [];
}

// File picker and drag-and-drop share this filter.
export function imageFilesFromList(files: File[], remaining: number) {
  return files
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, Math.max(0, remaining));
}
