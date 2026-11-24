"use client";

// Opens the setup dialog for a dropped Scro tool and turns the answers into a node group.

import { useMemo } from "react";
import type { CanvasLibraryAssetsResult } from "@/service/canvas/projects";
import type { GroupContext, ScroGroup } from "@/service/canvas/scro-groups/builder";
import { buildLifeGroup } from "@/service/canvas/scro-groups/life";
import { buildPosterGroup } from "@/service/canvas/scro-groups/poster";
import { buildSwapGroup } from "@/service/canvas/scro-groups/swap";
import { buildTeleportGroup } from "@/service/canvas/scro-groups/teleport";
import { LifeDialog } from "./life-dialog";
import { PosterDialog } from "./poster-dialog";
import { assetOptions, canvasMediaOptions, type CanvasMediaItem } from "./scro-group-options";
import { SwapDialog } from "./swap-dialog";
import { TeleportDialog } from "./teleport-dialog";

export type ScroDialogTool = "life" | "poster" | "swap" | "teleport";

export type ScroDialogState = {
  tool: ScroDialogTool;
  position: { x: number; y: number };
} | null;

// Life and Poster still ask before they land. Swap and Teleport drop their group directly.
export const SCRO_DIALOG_TOOL_BY_MODEL: Record<string, ScroDialogTool> = {
  "scro:life": "life",
  "scro:poster": "poster",
};

type Props = {
  state: ScroDialogState;
  isZh: boolean;
  assets: CanvasLibraryAssetsResult;
  canvasMedia: readonly CanvasMediaItem[];
  onCancel: () => void;
  onGroup: (group: ScroGroup, tool: ScroDialogTool) => void;
};

export function ScroGroupDialogs({ state, isZh, assets, canvasMedia, onCancel, onGroup }: Props) {
  const choices = useMemo(() => {
    const canvasImages = canvasMediaOptions(canvasMedia, "image");
    const characters = assetOptions(assets.characters, "image", "character");
    const products = assetOptions(assets.products, "image", "product");
    const recentImages = assetOptions(assets.recentOutputs, "image", "library");
    return {
      characters: [...characters, ...canvasImages],
      products: [...products, ...canvasImages],
      images: [...canvasImages, ...characters, ...products, ...recentImages],
      videos: [
        ...canvasMediaOptions(canvasMedia, "video"),
        ...assetOptions(assets.recentOutputs, "video", "library"),
      ],
    };
  }, [assets, canvasMedia]);

  if (!state) return null;
  // Fresh ids per submit so the same tool can be added many times.
  const ctx = (): GroupContext => ({
    idPrefix: `${state.tool}-${crypto.randomUUID().slice(0, 6)}`,
    origin: state.position,
  });

  switch (state.tool) {
    case "life":
      return (
        <LifeDialog
          open
          isZh={isZh}
          characterOptions={choices.characters}
          onCancel={onCancel}
          onSubmit={(values) => onGroup(buildLifeGroup(ctx(), values), "life")}
        />
      );
    case "poster":
      return (
        <PosterDialog
          open
          isZh={isZh}
          characterOptions={choices.characters}
          productOptions={choices.products}
          onCancel={onCancel}
          onSubmit={(values) => onGroup(buildPosterGroup(ctx(), values), "poster")}
        />
      );
    case "swap":
      return (
        <SwapDialog
          open
          isZh={isZh}
          videoOptions={choices.videos}
          referenceOptions={choices.images}
          onCancel={onCancel}
          onSubmit={(values) => onGroup(buildSwapGroup(ctx(), values), "swap")}
        />
      );
    case "teleport":
      return (
        <TeleportDialog
          open
          isZh={isZh}
          videoOptions={choices.videos}
          imageOptions={choices.images}
          onCancel={onCancel}
          onSubmit={(values) => onGroup(buildTeleportGroup(ctx(), values), "teleport")}
        />
      );
  }
}
