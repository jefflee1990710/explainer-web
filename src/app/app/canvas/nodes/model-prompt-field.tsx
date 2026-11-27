"use client";

// Prompt on a model card. The Explainer Director fills {{text_style}} from its own text style,
// so a new director does not show the token or ask for a Setting.

import type { ReactNode } from "react";
import type { SettingsVars } from "@/model/canvas-settings";
import { promptWithTextStyle } from "@/service/canvas/core/settings/explainer-text-style";
import { useCanvasTextSettings } from "@/app/app/canvas/nodes/canvas-text-dialog-field";
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
  // Optional column on the left of the textarea, used by the text-model Variable port.
  aside?: ReactNode;
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
  aside,
}: Props) {
  const shown = promptWithTextStyle(text, vars);
  const { vars: settingVars } = useCanvasTextSettings();
  const field = (
    <WiredPromptField isZh={isZh} value={shown} wired={wired} onEdit={onEdit} onOpenEditor={onOpenEditor} />
  );
  return (
    <>
      {aside ? (
        <div className="flex items-stretch gap-1">
          {aside}
          <div className="min-w-0 flex-1">{field}</div>
        </div>
      ) : (
        field
      )}
      {editorOpen ? (
        <PromptEditorDialog
          initial={shown}
          isZh={isZh}
          placeholders={settingVars}
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
