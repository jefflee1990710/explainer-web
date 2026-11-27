"use client";

// Explainer Director: owns every Explainer parameter and the plan, with Plan / Replan and
// three text outputs per clip (still prompt, motion prompt, voiceover).

import { Handle, Position } from "@xyflow/react";
import { AlertCircle, Clapperboard, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import type { CanvasLibraryCharacterOption } from "@/model/canvas-dto";
import {
  directorHandleId,
  directorNeedsReplan,
  directorNodeWithWiredPrompt,
  directorPromptPatch,
  readDirectorPlan,
  type DirectorOutputKind,
} from "@/service/canvas/directors/explainer-director";
import { readPlannerParams } from "@/service/canvas/directors/explainer-planner";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";
import { ExplainerDirectorFields } from "@/app/app/canvas/nodes/explainer-director-fields";
import { DirectorPlanProgress } from "@/app/app/canvas/nodes/director-plan-progress";
import { ScroDirectorPort } from "@/app/app/canvas/nodes/scro-director-port";

const OUTPUT_LABELS: { kind: DirectorOutputKind; zh: string; en: string }[] = [
  { kind: "frame", zh: "靜幀", en: "Still" },
  { kind: "motion", zh: "動作", en: "Motion" },
  { kind: "voice", zh: "旁白", en: "Voiceover" },
];
const DIRECTOR_COLOR = "#c6f24b";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  selected: boolean;
  disabled: boolean;
  characterOptions: readonly CanvasLibraryCharacterOption[];
  // Input handles that already have wires (older planner cards), kept so those wires render.
  incomingHandles: readonly string[];
  // Text wired into the topic port. Undefined when nothing is connected.
  wiredPrompt?: string;
  onUpdate: (patch: Partial<CanvasNodeData>) => void;
  onPlan: () => void;
  onRemove: () => void;
};

export function ExplainerDirectorCard({
  data,
  isZh,
  selected,
  disabled,
  characterOptions,
  incomingHandles,
  wiredPrompt,
  onUpdate,
  onPlan,
  onRemove,
}: Props) {
  const topicWired = wiredPrompt !== undefined;
  const live = directorNodeWithWiredPrompt({ type: "model" as const, data }, wiredPrompt);
  const node = live;
  const plan = readDirectorPlan(node);
  const { planStatus, planError } = readPlannerParams({ data });
  const planning = planStatus === "planning";
  const dirty = directorNeedsReplan(node);
  const canPlan = !disabled && !planning && Boolean((live.data.prompt ?? "").trim());

  return (
    <div
      className={`relative w-[300px] rounded-[16px] border bg-[#12161f]/95 text-white shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25" : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      {incomingHandles
        .filter((handle) => handle !== "prompt")
        .map((handle) => (
          <Handle key={handle} type="target" id={handle} position={Position.Left} isConnectable={false} style={{ opacity: 0 }} />
        ))}

      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/90">
          <span
            className="grid h-5 w-5 place-items-center rounded-md"
            style={{ backgroundColor: `${DIRECTOR_COLOR}22`, color: DIRECTOR_COLOR }}
          >
            {planning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clapperboard className="h-3 w-3" />}
          </span>
          {isZh ? "解說導演" : "Explainer Director"}
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
      <ScroDirectorPort
        id="prompt"
        color={PORT_COLOR_MAP.text}
        label={isZh ? "主題" : "Topic"}
        title={isZh ? "主題／講稿（可接文字輸出）" : "Topic (connect a text output)"}
        wired={topicWired}
        detail={topicWired ? (isZh ? "已連" : "Wired") : isZh ? "可輸入" : "Or type"}
      />

      <div className="flex flex-col gap-2.5 p-3">
        <ExplainerDirectorFields
          data={live.data}
          isZh={isZh}
          disabled={planning}
          characterOptions={characterOptions}
          onUpdate={(patch) => onUpdate(directorPromptPatch(data, patch, topicWired))}
        />

        {dirty && !planning ? (
          <p className="rounded-[8px] border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-[10.5px] leading-relaxed text-amber-100">
            {isZh ? "設定已改，請按 Replan。輸出暫時維持上次的規劃。" : "Settings changed. Press Replan; outputs keep the last plan until then."}
          </p>
        ) : null}
        {planning ? (
          <DirectorPlanProgress
            isZh={isZh}
            stage={typeof data.toolParams?.planStage === "string" ? data.toolParams.planStage : undefined}
            draft={data.toolParams?.planDraft === true}
            replanning={Boolean(plan)}
          />
        ) : null}
        {planStatus === "failed" && planError ? (
          <p className="flex items-start gap-1 rounded-[8px] bg-rose-500/10 px-2 py-1.5 text-[10.5px] text-rose-200">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            {planError}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!canPlan}
          onClick={onPlan}
          className={`nodrag inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11.5px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            !plan || dirty ? "bg-[#c6f24b] text-[#11141b] hover:brightness-105" : "border border-white/12 text-white/80 hover:bg-white/8"
          }`}
        >
          {planning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : plan ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {planning ? (isZh ? "規劃中…" : "Planning…") : plan ? "Replan" : "Plan"}
        </button>
      </div>

      <div className="border-t border-white/6 py-1.5">
        {plan ? (
          plan.clips.flatMap((clip) =>
            OUTPUT_LABELS.map(({ kind, zh, en }) => (
              <div key={`${clip.clipNumber}-${kind}`} className="relative flex justify-end px-3 py-[3px] text-[10.5px] text-white/70">
                Clip {clip.clipNumber} · {isZh ? zh : en}
                <Handle
                  type="source"
                  id={directorHandleId(clip.clipNumber, kind)}
                  position={Position.Right}
                  style={{ width: 10, height: 10, background: PORT_COLOR_MAP.text, border: "2px solid #0b0e13" }}
                />
              </div>
            )),
          )
        ) : (
          <p className="px-3 py-1 text-right text-[10.5px] text-white/30">
            {isZh ? "規劃後出現輸出" : "Outputs appear after planning"}
          </p>
        )}
      </div>
    </div>
  );
}
