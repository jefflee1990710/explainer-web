"use client";

// After a Director plan: build the rows (first plan), or rebuild / keep them when the clip count changed.

import { ScroDialogShell } from "@/app/app/canvas/scro-dialog-shell";

export type DirectorDecision =
  | { kind: "build"; nodeId: string; clipCount: number }
  | { kind: "count"; nodeId: string; oldCount: number; newCount: number };

type Props = {
  decision: DirectorDecision | null;
  isZh: boolean;
  onConfirm: () => void;
  onDecline: () => void;
};

export function DirectorPlanDecisionDialog({ decision, isZh, onConfirm, onDecline }: Props) {
  if (!decision) return null;
  if (decision.kind === "build") {
    return (
      <ScroDialogShell
        open
        isZh={isZh}
        title={isZh ? `已規劃 ${decision.clipCount} 段` : `Planned ${decision.clipCount} clips`}
        description={
          isZh
            ? "要不要自動建立每段的靜幀、影片、配音和拼接節點？它們的 prompt 會由解說導演的輸出口接過去。不建立的話，只會亮起輸出口，你可以自己接線。"
            : "Build each clip's still, video, voice, and concat nodes, with prompts wired from the Director's outputs? Otherwise only the outputs appear and you wire them yourself."
        }
        submitLabel={isZh ? "自動建立" : "Build nodes"}
        cancelLabel={isZh ? "只出輸出口" : "Outputs only"}
        canSubmit
        onCancel={onDecline}
        onSubmit={onConfirm}
      />
    );
  }
  return (
    <ScroDialogShell
      open
      isZh={isZh}
      title={isZh ? "段數改變了" : "Clip count changed"}
      description={
        isZh
          ? `新規劃由 ${decision.oldCount} 段變成 ${decision.newCount} 段。拆走舊節點重新建立，還是保留舊節點？保留的話，減少了的段會斷線，新增的段需要自己接線。`
          : `The new plan went from ${decision.oldCount} to ${decision.newCount} clips. Rebuild the nodes, or keep them? Keeping cuts wires from removed clips; wire new clips yourself.`
      }
      submitLabel={isZh ? "拆走舊節點重建" : "Rebuild"}
      cancelLabel={isZh ? "保留舊節點" : "Keep"}
      canSubmit
      onCancel={onDecline}
      onSubmit={onConfirm}
    />
  );
}
