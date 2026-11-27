// Output rows for nodes with more than one output (Split's Part A / Part B), one handle each.

import { Handle, Position } from "@xyflow/react";
import type { CanvasModelSpec } from "@/model/canvas-model";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";

export function ModelNodeExtraOutputs({ spec, isZh }: { spec: CanvasModelSpec; isZh: boolean }) {
  const outputs = [spec.output, ...(spec.extraOutputs ?? [])];
  return (
    <div className="space-y-1 border-t border-white/6 py-2">
      {outputs.map((output) => {
        const color = PORT_COLOR_MAP[output.type];
        return (
          <div key={output.id} className="relative flex items-center justify-end gap-1.5 px-3.5 py-0.5 text-[11px] text-white/80">
            <span>{isZh ? output.labels["zh-Hant"] : output.labels.en}</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            <Handle
              type="source"
              id={output.id}
              position={Position.Right}
              style={{ width: 13, height: 13, backgroundColor: color, border: "2px solid #0b0e13", right: -7 }}
            />
          </div>
        );
      })}
    </div>
  );
}
