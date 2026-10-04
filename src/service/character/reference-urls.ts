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

type VersionRefs = {
  id: { toHexString(): string };
  parentVersionId?: { toHexString(): string };
  blueprintUrl?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
};

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

// Edit sends the sheet being changed first, then the root version's uploaded photos.
// Later sheets are not included, so the face stays anchored to the originals.
export function editReferenceUrls(versions: VersionRefs[], parent: VersionRefs) {
  const urls: string[] = [];
  const seen = new Set<string>();
  function push(url?: string) {
    const value = url?.trim();
    if (!value || seen.has(value) || urls.length >= MAX_CHARACTER_REFERENCES) return;
    seen.add(value);
    urls.push(value);
  }

  push(parent.blueprintUrl);
  const byId = new Map(versions.map((version) => [version.id.toHexString(), version]));
  let current: VersionRefs | undefined = parent;
  const guard = new Set<string>();
  while (current?.parentVersionId) {
    const id = current.id.toHexString();
    if (guard.has(id)) break;
    guard.add(id);
    current = byId.get(current.parentVersionId.toHexString());
  }
  for (const url of characterReferenceUrls(current ?? parent)) push(url);
  return urls;
}

// File picker and drag-and-drop share this filter.
export function imageFilesFromList(files: File[], remaining: number) {
  return files
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, Math.max(0, remaining));
}
