"use client";

// Prompt on a model card. The Explainer Director fills {{text_style}} from its own text style,
// so a new director does not show the token or ask for a Setting.

import type { SettingsVars } from "@/model/canvas-settings";
import { promptWithTextStyle } from "@/service/canvas/core/settings/explainer-text-style";
import { PromptEditorDialog } from "@/app/app/canvas/nodes/prompt-editor-dialog";
import { PromptVarsHint } from "@/app/app/canvas/nodes/prompt-vars-hint";
import { WiredPromptField } from "@/app/app/canvas/nodes/wired-prompt-field";

type Props = {
  isZh: boolean;
  // Raw prompt, still containing {{text_style}} when the director owns the style.
  text: string;
  vars: SettingsVars;
  wired: boolean;
  editorOpen: boolean;
  onEdit: (prompt: string) => void;
  onOpenEditor: () => void;
  onCloseEditor: () => void;
};

export function ModelPromptField({
  isZh,
  text,
  vars,
  wired,
  editorOpen,
  onEdit,
  onOpenEditor,
  onCloseEditor,
}: Props) {
  const shown = promptWithTextStyle(text, vars);
  return (
    <>
      <WiredPromptField isZh={isZh} value={shown} wired={wired} onEdit={onEdit} onOpenEditor={onOpenEditor} />
      {editorOpen ? (
        <PromptEditorDialog
          initial={shown}
          isZh={isZh}
          onCancel={onCloseEditor}
          onSave={(prompt) => {
            onCloseEditor();
            // Closing an unchanged director prompt must not bake the style into the node.
            if (prompt !== shown) onEdit(prompt);
          }}
        />
      ) : null}
      <PromptVarsHint isZh={isZh} text={shown} vars={vars} missingBlocksRun />
    </>
  );
}
