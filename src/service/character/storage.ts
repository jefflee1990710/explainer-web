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

// Character files a video still points at. Deleting these breaks later frame submits.
export type VideoCharacterBlobSource = {
  cast?: Array<{
    blueprintUrl?: string;
    voiceSample?: { url?: string; urls?: string[] };
  }>;
  characterImageUrl?: string;
  characterStillUrl?: string;
};

export function videoCharacterBlobUrls(video: VideoCharacterBlobSource): string[] {
  const urls: string[] = [];
  for (const member of video.cast || []) {
    if (member.blueprintUrl) urls.push(member.blueprintUrl);
    if (member.voiceSample?.url) urls.push(member.voiceSample.url);
    for (const url of member.voiceSample?.urls || []) {
      if (url) urls.push(url);
    }
  }
  if (video.characterImageUrl) urls.push(video.characterImageUrl);
  if (video.characterStillUrl) urls.push(video.characterStillUrl);
  return urls;
}

// Drop URLs a video still uses so a character delete does not 404 an in-progress frame.
export function blobUrlsSafeToDelete(urls: string[], referenced: Iterable<string>): string[] {
  const keep = new Set(referenced);
  return [...new Set(urls)].filter((url) => !keep.has(url));
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
