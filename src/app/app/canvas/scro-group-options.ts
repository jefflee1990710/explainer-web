// Builds the media choices the tool setup dialogs offer (canvas nodes first, then the library).

import type { CanvasMediaKind } from "@/model/canvas";
import type { CanvasLibraryAsset } from "@/model/canvas-dto";
import type { GroupMediaRef } from "@/service/canvas/scro-groups/builder";

export type MediaPickOption = {
  key: string;
  label: string;
  source: "canvas" | "character" | "product" | "library" | "upload";
  mediaKind: CanvasMediaKind;
  url: string;
  portraitUrl?: string;
  fullBodyUrl?: string;
  ref: GroupMediaRef;
};

export type CanvasMediaItem = {
  nodeId: string;
  label: string;
  mediaKind: CanvasMediaKind;
  url: string;
};

export function canvasMediaOptions(items: readonly CanvasMediaItem[], kind: CanvasMediaKind): MediaPickOption[] {
  return items
    .filter((item) => item.mediaKind === kind)
    .map((item) => ({
      key: `canvas:${item.nodeId}`,
      label: item.label,
      source: "canvas",
      mediaKind: item.mediaKind,
      url: item.url,
      ref: { nodeId: item.nodeId },
    }));
}

export function assetOptions(
  assets: readonly CanvasLibraryAsset[],
  kind: CanvasMediaKind,
  source: MediaPickOption["source"],
): MediaPickOption[] {
  return assets
    .filter((asset) => asset.mediaKind === kind)
    .map((asset) => ({
      key: `${source}:${asset.id}`,
      label: asset.name,
      source,
      mediaKind: asset.mediaKind,
      url: asset.url,
      ...(asset.portraitUrl ? { portraitUrl: asset.portraitUrl } : {}),
      ...(asset.fullBodyUrl ? { fullBodyUrl: asset.fullBodyUrl } : {}),
      ref: { url: asset.url, name: asset.name, mediaKind: asset.mediaKind },
    }));
}
