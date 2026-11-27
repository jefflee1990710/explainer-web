"use client";

// Empty character node. Drop starts blank; photos and outfits wire in; Run asks Seedream for a blueprint.

import { useMemo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Maximize2, Trash2, UserRound } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { resolveNodeInputs } from "@/service/canvas/core/graph";
import {
  CHARACTER_BLUEPRINT_MODEL_ID,
  characterBlueprintGap,
} from "@/service/canvas/core/character-blueprint";
import { OutdatedBanner } from "@/app/app/canvas/nodes/outdated-notice";
import { PORT_COLOR_MAP, useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";
import { CharacterBlueprintActions } from "@/app/app/canvas/nodes/character-blueprint-actions";
import { CharacterBlueprintInputs } from "@/app/app/canvas/nodes/character-blueprint-inputs";

type Props = {
  id: string;
  data: CanvasNodeData;
  selected?: boolean;
};

export function CharacterBlueprintNodeCard({ id, data, selected }: Props) {
  const {
    catalog,
    nodes,
    edges,
    locale,
    isFlowRunning,
    onUpdateNodeData,
    onDeleteNode,
    onRunNode,
    onOpenLightbox,
    onSaveCharacterBlueprint,
    outdatedNodes,
  } = useCanvasNodeActions();
  const [saving, setSaving] = useState(false);
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const color = PORT_COLOR_MAP.image;
  const busy = data.status === "queued" || data.status === "running";
  const outputUrl = data.outputUrl?.trim() ?? "";
  const outdated = busy ? undefined : outdatedNodes.get(id);
  const promptWired = edges.some((edge) => edge.target === id && edge.targetHandle === "prompt");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of edges) {
      if (edge.target !== id || !edge.targetHandle) continue;
      map.set(edge.targetHandle, (map.get(edge.targetHandle) ?? 0) + 1);
    }
    return map;
  }, [edges, id]);

  const resolved = useMemo(
    () => resolveNodeInputs(id, nodes, edges, catalog),
    [catalog, edges, id, nodes],
  );
  const imageCount = resolved.inputs.refImages.length + (resolved.inputs.outfitRefs?.length ?? 0);
  const gap = characterBlueprintGap({ prompt: resolved.inputs.prompt, imageCount });
  const waitingUpstream = !resolved.ok && resolved.missingUpstreamNodeIds.length > 0;
  const canRun = !busy && !isFlowRunning && !gap && resolved.ok;
  const saved =
    Boolean(outputUrl) &&
    data.toolParams?.savedBlueprintUrl === outputUrl &&
    typeof data.toolParams?.savedCharacterId === "string";
  const canSave = Boolean(outputUrl) && !busy && !saving && !saved && Boolean(onSaveCharacterBlueprint);
  const isRerun = data.status === "completed" && Boolean(outputUrl) && !outdated;

  const runTitle = gap
    ? isZh
      ? "請描述角色，或接上參考圖／穿搭"
      : "Describe the character, or connect photos / an outfit"
    : waitingUpstream
      ? isZh
        ? "上游圖片還沒好"
        : "An input image is not ready"
      : undefined;
  const saveTitle = outputUrl
    ? !(data.label ?? "").trim()
      ? isZh
        ? "請先輸入角色名稱"
        : "Enter a character name first"
      : undefined
    : isZh
      ? "請先按 Run 生成藍圖"
      : "Run first to generate a blueprint";

  async function onSave() {
    if (!onSaveCharacterBlueprint) return;
    setSaving(true);
    try {
      await onSaveCharacterBlueprint(id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      data-canvas-character={outputUrl ? "blueprint" : "empty"}
      data-model-id={CHARACTER_BLUEPRINT_MODEL_ID}
      className={`group relative w-[280px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        data.status === "failed"
          ? `border-2 border-rose-500/80 ${selected ? "ring-2 ring-rose-500/30" : ""}`
          : selected
            ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25"
            : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/6 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#c6f24b]/15 text-[#c6f24b]">
            <UserRound className="h-3 w-3" />
          </span>
          <input
            value={data.label ?? ""}
            disabled={busy}
            placeholder={isZh ? "角色名稱" : "Character name"}
            onChange={(event) => onUpdateNodeData(id, { label: event.target.value.slice(0, 40) })}
            className="nodrag nowheel min-w-0 flex-1 bg-transparent text-[11.5px] font-semibold text-white/90 placeholder:text-white/35 outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => onDeleteNode(id)}
          title={isZh ? "刪除節點" : "Delete node"}
          className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-2.5 pb-2">
        {outputUrl ? (
          <div className={`relative overflow-hidden rounded-[10px] bg-black/40 ${outdated ? "opacity-70" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={outputUrl} alt={isZh ? "角色藍圖" : "Character blueprint"} className="max-h-[140px] w-full object-contain" />
            <button
              type="button"
              onClick={() => onOpenLightbox({ url: outputUrl, kind: "image", title: data.label || (isZh ? "角色" : "Character") })}
              className="nodrag absolute top-1.5 right-1.5 cursor-pointer rounded-md bg-black/65 p-1 text-white/85 opacity-0 transition group-hover:opacity-100 hover:bg-black"
              title={isZh ? "放大" : "Expand preview"}
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="grid h-20 place-items-center rounded-[10px] border border-dashed border-white/15 text-xs text-white/45">
            {isZh ? "空角色" : "Empty character"}
          </div>
        )}
      </div>

      <CharacterBlueprintInputs
        isZh={isZh}
        prompt={data.prompt ?? ""}
        promptWired={promptWired}
        busy={busy}
        counts={counts}
        onPrompt={(prompt) => onUpdateNodeData(id, { prompt })}
      />

      <div className="px-2.5 pt-2">
        {outdated ? <OutdatedBanner reason={outdated} isZh={isZh} /> : null}
        {data.status === "failed" && data.lastError ? (
          <p className="text-[11px] leading-4 text-rose-300">{data.lastError}</p>
        ) : null}
      </div>

      <CharacterBlueprintActions
        isZh={isZh}
        busy={busy}
        canRun={canRun}
        isRerun={isRerun}
        canSave={canSave}
        saved={saved}
        saving={saving}
        runTitle={runTitle}
        saveTitle={saveTitle}
        onRun={() => onRunNode(id)}
        onSave={() => void onSave()}
      />

      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          backgroundColor: color,
          border: "2px solid #0b0e13",
        }}
      />
    </div>
  );
}
