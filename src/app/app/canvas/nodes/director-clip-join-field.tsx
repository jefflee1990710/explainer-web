"use client";

// Director card: end the clip rows with a Concat chain or one Sequence (timeline) node.

import { useNodeId } from "@xyflow/react";
import type { CanvasNodeData } from "@/model/canvas";
import { readClipJoin, type ClipJoinMode } from "@/service/canvas/scro-groups/clip-join";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";
import { DIALOG_FIELD, DIALOG_LABEL } from "@/app/app/canvas/scro-dialog-shell";

export function DirectorClipJoinField({ data, isZh }: { data: CanvasNodeData; isZh: boolean }) {
  const nodeId = useNodeId();
  const { onSetDirectorClipJoin } = useCanvasNodeActions();
  if (!nodeId || !onSetDirectorClipJoin) return null;
  return (
    <label className={DIALOG_LABEL}>
      {isZh ? "收尾" : "Finish with"}
      <select
        aria-label={isZh ? "收尾" : "Finish with"}
        value={readClipJoin(data.toolParams)}
        onChange={(e) => onSetDirectorClipJoin(nodeId, e.target.value as ClipJoinMode)}
        className={`nodrag ${DIALOG_FIELD}`}
      >
        <option value="concat">{isZh ? "接片節點（Concat）" : "Concat nodes"}</option>
        <option value="sequence">{isZh ? "一條時間線（Sequence）" : "One Sequence (timeline)"}</option>
      </select>
    </label>
  );
}
