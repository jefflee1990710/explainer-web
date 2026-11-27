"use client";

// Topic typed on the Explainer Director card. A wired text node fills this until the user edits it.

import { CanvasTextDialogField } from "@/app/app/canvas/nodes/canvas-text-dialog-field";
import { DIALOG_LABEL, DIALOG_TEXTAREA } from "@/app/app/canvas/scro-dialog-shell";

type Props = {
  prompt: string;
  isZh: boolean;
  disabled: boolean;
  onPrompt: (prompt: string) => void;
};

export function ExplainerDirectorTopicField({ prompt, isZh, disabled, onPrompt }: Props) {
  return (
    <label className={DIALOG_LABEL}>
      {isZh ? "主題 / 講稿" : "Topic / script"}
      <CanvasTextDialogField
        rows={3}
        value={prompt}
        onValue={onPrompt}
        disabled={disabled}
        placeholder={isZh ? "例如：用煮食譜嘅比喻解釋乜嘢係源代碼…" : "e.g. Explain compound interest with three analogies…"}
        dialogLabel={isZh ? "編輯主題" : "Edit topic"}
        className={DIALOG_TEXTAREA}
      />
    </label>
  );
}
