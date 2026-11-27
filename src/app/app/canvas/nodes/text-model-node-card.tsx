"use client";

// Text model card: type a prompt, pick a chat model, run it, then wire the text out.

import { Handle, Position } from "@xyflow/react";
import { ModelNodeCardHeader } from "@/app/app/canvas/nodes/model-node-card-header";
import { ModelNodeCardPorts } from "@/app/app/canvas/nodes/model-node-card-ports";
import { ModelNodeCardRun } from "@/app/app/canvas/nodes/model-node-card-run";
import { ModelNodeFailedBanner } from "@/app/app/canvas/nodes/model-node-failed-banner";
import { CanvasTextDialogField } from "@/app/app/canvas/nodes/canvas-text-dialog-field";
import { ModelPromptField } from "@/app/app/canvas/nodes/model-prompt-field";
import { OutdatedBanner } from "@/app/app/canvas/nodes/outdated-notice";
import type { ModelNodeCardView } from "@/app/app/canvas/nodes/model-node-card-view";
import { TextModelPicker } from "@/app/app/canvas/nodes/text-model-picker";
import { readConnectedPromptText } from "@/service/canvas/core/graph";
import { swapCandidates } from "@/service/canvas/core/model-swap";

export function TextModelNodeCard(view: ModelNodeCardView) {
  const {
    id,
    data,
    selected,
    catalog,
    nodes,
    edges,
    onUpdateNodeData,
    isZh,
    spec,
    displayName,
    locale,
    outputColor,
    status,
    isBusy,
    outdated,
    isPromptWired,
    promptEditorOpen,
    setPromptEditorOpen,
    templateVars,
    toolParams,
  } = view;
  const choices = [spec, ...swapCandidates(spec, catalog)];
  const promptEdited = data.toolParams?.promptEdited === true;
  const connected = isPromptWired ? readConnectedPromptText(id, nodes, edges, catalog) : undefined;
  const shownPrompt = isPromptWired && !promptEdited ? (connected ?? "") : (data.prompt ?? "");
  const outputText = data.text ?? "";

  const savePrompt = (prompt: string) => {
    onUpdateNodeData(
      id,
      isPromptWired ? { prompt, toolParams: { ...toolParams, promptEdited: true } } : { prompt },
    );
  };

  return (
    <div
      className={`relative w-[312px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_18px_42px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all ${
        isBusy
          ? "canvas-model-running border-2"
          : status === "failed"
            ? `border-2 border-rose-500/80 ${selected ? "ring-2 ring-rose-500/30" : ""}`
            : selected
              ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/20"
              : "border-[#252c3b] hover:border-[#3a455c]"
      }`}
    >
      <ModelNodeCardHeader {...view} />
      <ModelNodeCardPorts {...view} />
      <div className="space-y-2.5 p-3">
        <TextModelPicker
          spec={spec}
          choices={choices}
          locale={locale}
          isZh={isZh}
          disabled={isBusy}
          onChange={(modelId) => view.onSwapModel(id, modelId)}
        />

        <ModelPromptField
          isZh={isZh}
          text={shownPrompt}
          vars={templateVars}
          wired={isPromptWired}
          editorOpen={promptEditorOpen}
          onEdit={savePrompt}
          onOpenEditor={() => setPromptEditorOpen(true)}
          onCloseEditor={() => setPromptEditorOpen(false)}
        />
        {status === "failed" ? <ModelNodeFailedBanner message={data.lastError} /> : null}
        {outdated ? <OutdatedBanner reason={outdated} isZh={isZh} /> : null}
        <ModelNodeCardRun {...view} />

        {outputText ? (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-white/50">
              {isZh ? "輸出文字（可改，不會重跑）" : "Output (edit without re-running)"}
            </span>
            <CanvasTextDialogField
              value={outputText}
              rows={6}
              onValue={(text) => onUpdateNodeData(id, { text })}
              dialogLabel={isZh ? "編輯輸出文字" : "Edit output"}
              className="nodrag w-full resize-y rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
            />
          </label>
        ) : (
          <p className="text-[10px] leading-relaxed text-white/40">
            {isZh
              ? "執行後，這段文字可以接到提示詞、導演主題，或其他文字輸入。"
              : "After you run it, this text can connect to a prompt, a director topic, or any other text input."}
          </p>
        )}
      </div>
      <Handle
        type="source"
        id="output"
        position={Position.Right}
        title={isZh ? "輸出文字" : "Text"}
        style={{
          width: 13,
          height: 13,
          backgroundColor: outputColor,
          border: "2px solid #0b0e13",
        }}
      />
      <span className="sr-only">{displayName}</span>
    </div>
  );
}
