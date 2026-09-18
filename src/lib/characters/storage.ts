import type { Character } from "@/types/character";

// Every reference image and persisted blueprint URL on a character document.
export function collectCharacterBlobUrls(character: Character): string[] {
  const urls = new Set<string>();
  for (const version of character.versions) {
    if (version.referenceImageUrl) urls.add(version.referenceImageUrl);
    if (version.blueprintUrl) urls.add(version.blueprintUrl);
  }
  return [...urls];
}

export function isExplainerBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith(".public.blob.vercel-storage.com") &&
      parsed.pathname.startsWith("/explainer/")
    );
  } catch {
    return false;
  }
}
