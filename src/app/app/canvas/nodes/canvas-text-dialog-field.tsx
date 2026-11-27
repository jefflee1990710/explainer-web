"use client";

// Variable input (a Setting node still connects here) and the enlarge control shared by canvas text fields.

import { createContext, useContext, useState, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { Maximize2 } from "lucide-react";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { SettingsVars } from "@/model/canvas-settings";
import { connectedSettingsVars } from "@/service/canvas/core/graph";
import { SETTINGS_HANDLE } from "@/service/canvas/core/settings/types";
import { SETTING_COLOR } from "@/app/app/canvas/nodes/settings-node-card";
import { ComposedInput, ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";
import { PromptEditorDialog } from "@/app/app/canvas/nodes/prompt-editor-dialog";

type CanvasTextSettingsValue = {
  isZh: boolean;
  connected: boolean;
  vars?: SettingsVars;
};

const CanvasTextSettingsContext = createContext<CanvasTextSettingsValue>({ isZh: false, connected: false });

// Vars of the Setting wired into this node, if any.
export function CanvasTextSettings({
  nodeId,
  nodes,
  edges,
  isZh,
  children,
}: {
  nodeId: string;
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
  isZh: boolean;
  children: ReactNode;
}) {
  const vars = connectedSettingsVars(nodeId, nodes, edges);
  return (
    <CanvasTextSettingsContext.Provider value={{ isZh, connected: vars !== undefined, vars }}>
      {children}
    </CanvasTextSettingsContext.Provider>
  );
}

export function useCanvasTextSettings(): CanvasTextSettingsValue {
  return useContext(CanvasTextSettingsContext);
}

// Visible name of this input. The source node is still a Setting.
export function variablePortCopy(isZh: boolean): { label: string; title: string } {
  return isZh
    ? { label: "變數", title: "變數（填入 {{key}}）" }
    : { label: "Variable", title: "Variable (fills {{key}})" };
}

// Left-side handle a Setting node connects to.
export function SettingsInputRow() {
  const { isZh, connected } = useCanvasTextSettings();
  const color = connected ? SETTING_COLOR : "#64748b";
  const copy = variablePortCopy(isZh);
  return (
    <div className="relative flex items-center justify-between border-b border-white/6 px-3 py-1.5 text-[11px]">
      <Handle
        type="target"
        id={SETTINGS_HANDLE}
        position={Position.Left}
        title={copy.title}
        style={{
          width: 11,
          height: 11,
          backgroundColor: connected ? SETTING_COLOR : "#0b0e13",
          border: `2px solid ${color}`,
          left: -6,
        }}
      />
      <span className="flex items-center gap-1.5 text-white/80">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {copy.label}
      </span>
      <span className="text-[10px] text-white/45">{connected ? (isZh ? "已連" : "Wired") : isZh ? "選填" : "Optional"}</span>
    </div>
  );
}

type FieldProps = {
  value: string;
  onValue: (next: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  dialogLabel?: string;
};

// A text field that opens the editor. The editor lists Setting placeholders only when one is connected.
export function CanvasTextDialogField({
  value,
  onValue,
  multiline = true,
  rows,
  placeholder,
  className,
  disabled,
  ariaLabel,
  dialogLabel,
}: FieldProps) {
  const { isZh, vars } = useCanvasTextSettings();
  const [open, setOpen] = useState(false);
  const field = multiline ? (
    <ComposedTextarea
      value={value}
      onValue={onValue}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
    />
  ) : (
    <ComposedInput
      value={value}
      onValue={onValue}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
    />
  );
  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">{field}</div>
      <button
        type="button"
        disabled={disabled}
        title={isZh ? "放大編輯" : "Edit text"}
        aria-label={isZh ? "放大編輯文字" : "Edit text"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="nodrag mt-1 shrink-0 cursor-pointer rounded-md p-1 text-white/45 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <PromptEditorDialog
          initial={value}
          isZh={isZh}
          label={dialogLabel}
          placeholders={vars}
          onCancel={() => setOpen(false)}
          onSave={(next) => {
            setOpen(false);
            if (next !== value) onValue(next);
          }}
        />
      ) : null}
    </div>
  );
}
