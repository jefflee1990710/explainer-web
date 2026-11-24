"use client";

// Titled frame drawn behind a canvas group. Only the title bar is interactive:
// drag it to move every member, rename, recolor, collapse, run the group, ungroup, or delete it.

import { memo, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { ChevronsDownUp, ChevronsUpDown, Play, Trash2, Ungroup } from "lucide-react";
import type { CanvasGroupKind } from "@/model/canvas";
import { CANVAS_GROUP_COLORS } from "@/service/canvas/groups";
import { useCanvasGroupActions } from "./group-actions-context";
import { GROUP_COLOR_HEX, type GroupFrameNode } from "./group-frames";

const KIND_LABEL: Record<CanvasGroupKind, { zh: string; en: string }> = {
  explainer: { zh: "解說片", en: "Explainer" },
  "talking-head": { zh: "口播導演", en: "Talking Head Director" },
  life: { zh: "生活照", en: "Life Photo" },
  poster: { zh: "海報", en: "Poster" },
  swap: { zh: "換角", en: "Scro Swap" },
  teleport: { zh: "換場景", en: "Teleport" },
  custom: { zh: "群組", en: "Group" },
};

function GroupFrameNodeInner({ data }: NodeProps<GroupFrameNode>) {
  const actions = useCanvasGroupActions();
  const { group, runnableCount } = data;
  const { isZh } = actions;
  const color = GROUP_COLOR_HEX[group.color];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.title);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const kind = KIND_LABEL[group.kind];
  const count = group.memberIds.length;

  const commitTitle = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== group.title) actions.onRename(group.id, next);
    else setDraft(group.title);
  };

  const iconButton =
    "nodrag grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div
      className={`relative h-full w-full rounded-2xl border-[1.5px] ${group.collapsed ? "bg-[#12161f]/95 shadow-xl" : ""}`}
      style={{
        borderColor: `${color}66`,
        ...(group.collapsed ? {} : { backgroundColor: `${color}0d` }),
      }}
    >
      {/* Title bar: the drag handle for the whole group */}
      <div
        className="scro-group-drag pointer-events-auto absolute inset-x-0 top-0 flex h-11 cursor-grab items-center gap-2 rounded-t-2xl px-3 active:cursor-grabbing"
        style={{ backgroundColor: `${color}1f` }}
      >
        <div className="relative">
          <button
            type="button"
            aria-label={isZh ? "更改顏色" : "Change color"}
            onClick={() => setPaletteOpen((open) => !open)}
            className="nodrag grid h-6 w-6 cursor-pointer place-items-center rounded-md transition hover:bg-white/10"
          >
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          </button>
          {paletteOpen ? (
            <div className="nodrag absolute left-0 top-8 z-10 flex gap-1.5 rounded-xl border border-white/10 bg-[#12161f] p-2 shadow-2xl">
              {CANVAS_GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => {
                    setPaletteOpen(false);
                    actions.onColor(group.id, c);
                  }}
                  className={`h-5 w-5 cursor-pointer rounded-full transition hover:scale-110 ${c === group.color ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#12161f]" : ""}`}
                  style={{ backgroundColor: GROUP_COLOR_HEX[c] }}
                />
              ))}
            </div>
          ) : null}
        </div>

        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setDraft(group.title);
                setEditing(false);
              }
            }}
            className="nodrag min-w-0 flex-1 rounded-md border border-white/15 bg-[#0b0e14] px-2 py-1 text-[13px] font-semibold text-white focus:border-[#c6f24b]/60 focus:outline-none"
          />
        ) : (
          <span
            title={isZh ? "雙擊重新命名" : "Double-click to rename"}
            onDoubleClick={() => {
              setDraft(group.title);
              setEditing(true);
            }}
            className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/95"
          >
            {group.title}
          </span>
        )}

        <span
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold"
          style={{ backgroundColor: `${color}26`, color }}
        >
          {isZh ? kind.zh : kind.en}
        </span>
        {group.collapsed ? null : (
          <span className="shrink-0 text-[11px] text-white/45">
            {isZh ? `${count} 個節點` : `${count} node${count === 1 ? "" : "s"}`}
          </span>
        )}

        <button
          type="button"
          onClick={() => actions.onRun(group.id)}
          disabled={actions.isFlowRunning || runnableCount === 0}
          title={isZh ? "只執行這個群組" : "Run only this group"}
          className="nodrag flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-[#c6f24b] px-2.5 text-[11.5px] font-bold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="h-3 w-3 fill-current" />
          {isZh ? "執行群組" : "Run group"}
        </button>
        <button
          type="button"
          onClick={() => actions.onToggleCollapse(group.id)}
          title={group.collapsed ? (isZh ? "展開" : "Expand") : isZh ? "收合" : "Collapse"}
          className={iconButton}
        >
          {group.collapsed ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => actions.onUngroup(group.id)}
          title={isZh ? "解散群組（保留節點）" : "Ungroup (keep nodes)"}
          className={iconButton}
        >
          <Ungroup className="h-4 w-4" />
        </button>
        {/* Removes the frame and every node inside it, including their wires. */}
        <button
          type="button"
          onClick={() => actions.onDelete(group.id)}
          title={isZh ? "刪除群組同所有節點" : "Delete group and its nodes"}
          aria-label={isZh ? "刪除群組" : "Delete group"}
          className="nodrag grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-white/55 transition hover:bg-rose-500/15 hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {group.collapsed ? (
        <button
          type="button"
          onClick={() => actions.onToggleCollapse(group.id)}
          className="nodrag pointer-events-auto absolute inset-x-0 bottom-0 top-11 cursor-pointer rounded-b-2xl px-3 text-left text-[11.5px] text-white/50 transition hover:text-white/80"
        >
          {isZh ? `已收合 ${count} 個節點，點擊展開` : `${count} nodes hidden. Click to expand.`}
        </button>
      ) : null}
    </div>
  );
}

export const GroupFrameNodeCard = memo(GroupFrameNodeInner);
