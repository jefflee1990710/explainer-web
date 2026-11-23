"use client";

// Settings node: picks the card for its kind (Explainer, Swap, Teleport).

import type { NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@/model/canvas";
import { ExplainerSettingsNodeCard } from "@/app/app/canvas/nodes/explainer-settings-node-card";
import { SwapSettingsNodeCard } from "@/app/app/canvas/nodes/swap-settings-node-card";
import { TeleportSettingsNodeCard } from "@/app/app/canvas/nodes/teleport-settings-node-card";

export function SettingsNodeCard(props: NodeProps & { data: CanvasNodeData }) {
  switch (props.data.settings?.kind) {
    case "swap":
      return <SwapSettingsNodeCard {...props} />;
    case "teleport":
      return <TeleportSettingsNodeCard {...props} />;
    default:
      return <ExplainerSettingsNodeCard {...props} />;
  }
}
