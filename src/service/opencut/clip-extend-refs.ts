export type ExtendRefCastItem = {
  blueprintUrl?: string;
  imageUrl?: string;
};

export type ExtendRefProductItem = {
  blueprintUrl?: string;
  imageUrl?: string;
};

export type ExtendRefClipRow = {
  clipNumber: number;
  cast?: readonly ExtendRefCastItem[];
  products?: readonly ExtendRefProductItem[];
  backgroundSetId?: string;
  backgroundImageUrls?: readonly string[];
  referenceImageIds?: readonly string[];
};

export type ExtendRefFrameItem = {
  clipNumber: number;
  position: "start" | "end";
  status?: string;
  blobUrl?: string;
  outputUrl?: string;
};

export type ExtendRefProjectSource = {
  phaseA?: {
    clips: readonly ExtendRefClipRow[];
  };
  cast?: readonly ExtendRefCastItem[];
  characterStillUrl?: string;
  characterImageUrl?: string;
  backgroundPlates?: ReadonlyArray<{ setId: string; url?: string }>;
  backgroundImageUrls?: readonly string[];
  referenceImages?: ReadonlyArray<{ id: string; url: string }>;
  products?: readonly ExtendRefProductItem[];
  objectSheetUrl?: string;
  frames?: readonly ExtendRefFrameItem[];
};

/**
 * Resolve default Character, Scene, and Props/Product reference image URLs
 * for a given storyboard clip from its per-clip overrides and project-level locks.
 */
export function resolveClipExtendReferences(
  project: ExtendRefProjectSource,
  clipNumber: number,
): {
  characterImageUrls: string[];
  sceneImageUrl?: string;
  propImageUrls: string[];
} {
  const row = project.phaseA?.clips.find((c) => c.clipNumber === clipNumber);

  const castSource = row?.cast && row.cast.length > 0 ? row.cast : project.cast ?? [];
  const characterImageUrls: string[] = [];
  for (const member of castSource) {
    const url = (member.blueprintUrl || member.imageUrl)?.trim();
    if (url && url.startsWith("https://") && !characterImageUrls.includes(url)) {
      characterImageUrls.push(url);
      if (characterImageUrls.length >= 6) break;
    }
  }
  if (characterImageUrls.length === 0) {
    const fallbackChar = (project.characterStillUrl || project.characterImageUrl)?.trim();
    if (fallbackChar && fallbackChar.startsWith("https://")) {
      characterImageUrls.push(fallbackChar);
    }
  }

  let sceneImageUrl: string | undefined;
  if (row?.backgroundSetId) {
    const plateUrl = project.backgroundPlates
      ?.find((p) => p.setId === row.backgroundSetId)
      ?.url?.trim();
    if (plateUrl && plateUrl.startsWith("https://")) {
      sceneImageUrl = plateUrl;
    }
  }
  if (!sceneImageUrl) {
    const anyPlateUrl = project.backgroundPlates
      ?.find((p) => p.url?.trim().startsWith("https://"))
      ?.url?.trim();
    if (anyPlateUrl) {
      sceneImageUrl = anyPlateUrl;
    }
  }
  if (!sceneImageUrl) {
    const bgUrl = (row?.backgroundImageUrls?.[0] || project.backgroundImageUrls?.[0])?.trim();
    if (bgUrl && bgUrl.startsWith("https://")) {
      sceneImageUrl = bgUrl;
    }
  }
  if (!sceneImageUrl && row?.referenceImageIds?.length) {
    for (const refId of row.referenceImageIds) {
      const refUrl = project.referenceImages?.find((r) => r.id === refId)?.url?.trim();
      if (refUrl && refUrl.startsWith("https://")) {
        sceneImageUrl = refUrl;
        break;
      }
    }
  }
  if (!sceneImageUrl && project.frames?.length) {
    const clipStart =
      project.frames.find(
        (f) => f.clipNumber === clipNumber && f.position === "start" && (f.blobUrl || f.outputUrl),
      ) ||
      project.frames.find(
        (f) => f.clipNumber === 1 && f.position === "start" && (f.blobUrl || f.outputUrl),
      );
    const frameUrl = (clipStart?.blobUrl || clipStart?.outputUrl)?.trim();
    if (frameUrl && frameUrl.startsWith("https://")) {
      sceneImageUrl = frameUrl;
    }
  }

  const productSource =
    row?.products && row.products.length > 0 ? row.products : project.products ?? [];
  const propImageUrls: string[] = [];
  for (const prod of productSource) {
    const url = (prod.blueprintUrl || prod.imageUrl)?.trim();
    if (url && url.startsWith("https://") && !propImageUrls.includes(url)) {
      propImageUrls.push(url);
      if (propImageUrls.length >= 4) break;
    }
  }
  const sheetUrl = project.objectSheetUrl?.trim();
  if (
    sheetUrl &&
    sheetUrl.startsWith("https://") &&
    !propImageUrls.includes(sheetUrl) &&
    propImageUrls.length < 4
  ) {
    propImageUrls.push(sheetUrl);
  }

  return {
    characterImageUrls,
    ...(sceneImageUrl ? { sceneImageUrl } : {}),
    propImageUrls,
  };
}
