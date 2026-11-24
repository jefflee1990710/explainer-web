"use client";

// Talking Head director: script, character, language, framing, and ratio live on the card.
// Plan is pressed here; the card is replaced by the expanded clip rows when planning finishes.

import { AlertCircle, Loader2, Sparkles, Trash2, UserRound } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";
import { readPlannerParams } from "@/service/canvas/explainer-planner";
import { TalkingHeadDirectorFields } from "@/app/app/canvas/nodes/talking-head-director-fields";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  selected: boolean;
  disabled: boolean;
  characterOptions: readonly CanvasLibraryCharacterOption[];
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
  onUpdate,
  onPlan,
  onRemove,
}: Props) {
  const { planStatus, planError } = readPlannerParams({ data });
  const planning = planStatus === "planning";
  const failed = planStatus === "failed";
  const hasScript = Boolean((data.prompt ?? "").trim());
  const hasCharacter = Boolean(data.toolParams?.characterId);
  const canPlan = !disabled && !planning && hasScript && hasCharacter;

  return (
    <div
      className={`w-[300px] rounded-[16px] border bg-[#12161f]/95 text-white shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25" : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/90">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-[#c6f24b]/15 text-[#c6f24b]">
            {planning ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserRound className="h-3 w-3" />}
          </span>
          Talking Head
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

      <div className="flex flex-col gap-2.5 p-3">
        <TalkingHeadDirectorFields
          data={data}
          isZh={isZh}
          disabled={planning}
          characterOptions={characterOptions}
          onUpdate={onUpdate}
        />
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
