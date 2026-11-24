"use client";

// Talking Head director: script, character, language, framing, and ratio live on the card.
// Plan is pressed here; the card is replaced by the expanded clip rows when planning finishes.

import { Handle, Position } from "@xyflow/react";
import { useEffect } from "react";
import { AlertCircle, Loader2, Sparkles, Trash2, UserRound } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";
import { DIRECTOR_CHARACTER_HANDLE } from "@/service/canvas/explainer-director";
import { readPlannerParams } from "@/service/canvas/explainer-planner";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";
import { TalkingHeadDirectorFields } from "@/app/app/canvas/nodes/talking-head-director-fields";

type WiredCharacter = { nodeId: string; characterId?: string; label?: string };

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  selected: boolean;
  disabled: boolean;
  characterOptions: readonly CanvasLibraryCharacterOption[];
  wiredCharacter?: WiredCharacter;
  onUpdate: (patch: Partial<CanvasNodeData>) => void;
  onPlan: () => void;
  onRemove: () => void;
};

export function TalkingHeadDirectorCard({
  data,
  isZh,
  selected,
  disabled,
  characterOptions,
  wiredCharacter,
  onUpdate,
  onPlan,
  onRemove,
}: Props) {
  const { planStatus, planError } = readPlannerParams({ data });
  const planning = planStatus === "planning";
  const failed = planStatus === "failed";
  const hasScript = Boolean((data.prompt ?? "").trim());
  const characterMissing = Boolean(wiredCharacter && !wiredCharacter.characterId);
  const hasCharacter = Boolean(wiredCharacter ? wiredCharacter.characterId : data.toolParams?.characterId);
  const canPlan = !disabled && !planning && hasScript && hasCharacter && !characterMissing;

  // The wired character is the one this plan uses. Keep the dropdown in step with it.
  useEffect(() => {
    if (!wiredCharacter) return;
    const current = typeof data.toolParams?.characterId === "string" ? data.toolParams.characterId : undefined;
    if (current === wiredCharacter.characterId) return;
    onUpdate({
      toolParams: { ...(data.toolParams ?? {}), characterId: wiredCharacter.characterId },
    });
  }, [wiredCharacter, data.toolParams, onUpdate]);

  return (
    <div
      className={`relative w-[300px] rounded-[16px] border bg-[#12161f]/95 text-white shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25" : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/90">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-[#c6f24b]/15 text-[#c6f24b]">
            {planning ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserRound className="h-3 w-3" />}
          </span>
          {isZh ? "口播導演" : "Talking Head Director"}
        </span>
        <button
          type="button"
          onClick={onRemove}
          title={isZh ? "移除" : "Remove"}
          className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative flex items-center justify-between border-b border-white/6 px-3 py-1.5 text-[11px]">
        <Handle
          type="target"
          id={DIRECTOR_CHARACTER_HANDLE}
          position={Position.Left}
          title={isZh ? "角色（可選）" : "Character (optional)"}
          style={{
            width: 11,
            height: 11,
            backgroundColor: wiredCharacter ? PORT_COLOR_MAP.image : "#12161f",
            border: `2px solid ${PORT_COLOR_MAP.image}`,
            left: -6,
          }}
        />
        <span className="flex items-center gap-1.5 text-white/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PORT_COLOR_MAP.image }} />
          {isZh ? "角色" : "Character"}
        </span>
        <span className="max-w-[140px] truncate text-[10px] text-white/45">
          {wiredCharacter ? (wiredCharacter.label ?? (isZh ? "已連" : "Wired")) : isZh ? "可選" : "Optional"}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        <TalkingHeadDirectorFields
          data={data}
          isZh={isZh}
          disabled={planning}
          characterOptions={characterOptions}
          wiredCharacter={wiredCharacter}
          onUpdate={onUpdate}
        />
        {characterMissing ? (
          <p className="rounded-[8px] bg-rose-500/10 px-2 py-1.5 text-[10.5px] text-rose-200">
            {isZh ? "連接的角色卡沒有可用的角色。" : "The connected character card has no character."}
          </p>
        ) : null}
        {planning ? (
          <p className="text-[10.5px] text-white/45">
            {isZh
              ? "規劃中，約需 1–3 分鐘。完成後會換成開場靜幀同每段配音、對嘴、調色節點。"
              : "Planning, about 1–3 minutes. This card then becomes the opening still and the per-clip voice, lip-sync, and grade nodes."}
          </p>
        ) : null}
        {failed && planError ? (
          <p className="flex items-start gap-1 rounded-[8px] bg-rose-500/10 px-2 py-1.5 text-[10.5px] text-rose-200">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            {planError}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!canPlan}
          onClick={onPlan}
          className="nodrag inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#c6f24b] px-3 py-1.5 text-[11.5px] font-bold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {planning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {planning ? (isZh ? "規劃中…" : "Planning…") : failed ? (isZh ? "重試" : "Retry") : "Plan"}
        </button>
      </div>
    </div>
  );
}
