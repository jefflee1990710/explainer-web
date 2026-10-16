import { ObjectId } from "mongodb";
import type { Character } from "@/model/character";

// Dedupe and parse valid Mongo ObjectIds for bulk character actions.
export function parseValidCharacterObjectIds(ids: string[]): ObjectId[] {
  return [...new Set(ids)].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
}

// Every reference image and persisted blueprint URL on a character document.
export function collectCharacterBlobUrls(character: Character): string[] {
  const urls = new Set<string>();
  for (const version of character.versions) {
    if (version.referenceImageUrl) urls.add(version.referenceImageUrl);
    for (const url of version.referenceImageUrls || []) urls.add(url);
    if (version.portraitUrl) urls.add(version.portraitUrl);
    if (version.blueprintUrl) urls.add(version.blueprintUrl);
    if (version.profileUrl) urls.add(version.profileUrl);
  }
  return [...urls];
}

// Dedupe reference and blueprint URLs across a batch of character documents.
export function collectCharactersBlobUrls(characters: Character[]): string[] {
  return [...new Set(characters.flatMap((character) => collectCharacterBlobUrls(character)))];
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
