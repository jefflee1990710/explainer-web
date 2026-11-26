"use client";

// Top bar for /app/canvas: project switcher, USD credit badge, and Run Flow.

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  Play,
  Square,
  Wallet,
} from "lucide-react";
import { CanvasLibraryDialog } from "@/app/app/canvas/canvas-library-dialog";
import { ComposedInput } from "@/app/app/canvas/nodes/composed-text-field";
import { formatUsd } from "@/service/billing/usd";
import type { CanvasFolderDto } from "@/model/canvas-dto";
import type { CanvasProjectSummaryDto } from "@/model/canvas-dto";
import type { CanvasFlowHeaderStatus } from "@/app/app/canvas/flow-header-status";

export type { CanvasFlowFailure, CanvasFlowHeaderStatus } from "@/app/app/canvas/flow-header-status";

export type SaveStatus = "saved" | "saving" | "dirty" | "error";

export function CanvasTopbar({
  locale,
  projects,
  folders,
  activeProjectId,
  activeTitle,
  saveStatus,
  creditUsd,
  flowModelCount,
  isFlowRunning,
  flowWaveProgress,
  flowStatus,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onMoveProject,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onRunFlow,
  onStopFlow,
}: {
  locale: string;
  projects: readonly CanvasProjectSummaryDto[];
  folders: readonly CanvasFolderDto[];
  activeProjectId: string;
  activeTitle: string;
  saveStatus: SaveStatus;
  creditUsd: number;
  flowModelCount: number;
  isFlowRunning: boolean;
  flowWaveProgress: { current: number; total: number } | null;
  flowStatus: CanvasFlowHeaderStatus | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (folderId?: string) => void;
  onRenameProject: (projectId: string, nextTitle: string) => void;
  onDeleteProject: (projectId: string) => void;
  onMoveProject: (projectId: string, folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRunFlow: () => void;
  onStopFlow: () => void;
}) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const [libraryOpen, setLibraryOpen] = useState(false);
  const titleRef = useRef(activeTitle);
  const skipTitleCommit = useRef(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitleState] = useState(activeTitle);
  const setDraftTitle = (next: string) => {
    titleRef.current = next;
    setDraftTitleState(next);
  };

  function startRename() {
    setDraftTitle(activeTitle);
    setEditingTitle(true);
  }

  function commitRename(raw = titleRef.current) {
    const trimmed = raw.trim();
    setEditingTitle(false);
    if (trimmed && trimmed !== activeTitle) {
      onRenameProject(activeProjectId, trimmed);
    }
  }

  const saveLabel =
    saveStatus === "saving"
      ? isZh
        ? "儲存中…"
        : "Saving…"
      : saveStatus === "dirty"
        ? isZh
          ? "未儲存"
          : "Unsaved"
        : saveStatus === "error"
          ? isZh
            ? "儲存失敗"
            : "Save failed"
          : isZh
            ? "已自動儲存"
            : "Saved";

  return (
    <>
    <header className="relative z-30 flex h-13 shrink-0 items-center justify-between gap-2 border-b border-white/8 bg-[#0e121a]/95 px-3 backdrop-blur-md">
      {/* Left: project switcher, inline rename, save pill */}
      <div className="flex min-w-0 items-center gap-2">
        {editingTitle ? (
          <div className="flex items-center gap-1">
            <ComposedInput
              type="text"
              value={draftTitle}
              onValue={setDraftTitle}
              onBlur={(e) => {
                if (skipTitleCommit.current) {
                  skipTitleCommit.current = false;
                  return;
                }
                commitRename(e.currentTarget.value);
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") {
                  skipTitleCommit.current = true;
                  commitRename(e.currentTarget.value);
                }
                if (e.key === "Escape") {
                  skipTitleCommit.current = true;
                  setEditingTitle(false);
                }
              }}
              autoFocus
              className="h-8 w-48 rounded-[9px] border border-[#c6f24b]/60 bg-[#0a0d13] px-2.5 text-xs font-semibold text-white focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitRename()}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] bg-[#c6f24b] text-[#11141b]"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              title={isZh ? "開啟或管理畫布" : "Open or manage canvases"}
              className="flex h-8 max-w-[220px] cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-white transition hover:border-white/20 hover:bg-white/8"
            >
              <span className="truncate">{activeTitle}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/55" />
            </button>
            <button
              type="button"
              onClick={startRename}
              title={isZh ? "重新命名" : "Rename canvas"}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] text-white/50 transition hover:bg-white/8 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

          </div>
        )}

        <span
          className={`hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium sm:inline-flex ${
            saveStatus === "error"
              ? "border-rose-500/40 bg-rose-500/12 text-rose-300"
              : saveStatus === "saving" || saveStatus === "dirty"
                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                : "border-white/10 bg-white/4 text-white/50"
          }`}
        >
          {saveStatus === "saving" ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : null}
          {saveLabel}
        </span>
        <FlowStatusPill status={flowStatus} isZh={isZh} />
      </div>

      {/* Right: USD balance + primary Run Flow button */}
      <div className="flex items-center gap-2">
        <Link
          href="/app/billing"
          title={isZh ? "查看 USD Credit 餘額與加值" : "View USD Credit balance"}
          className="hidden items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/4 px-2.5 py-1.5 text-xs font-semibold text-white/85 transition hover:border-[#c6f24b]/40 hover:text-white lg:inline-flex"
        >
          <Wallet className="h-3.5 w-3.5 text-[#c6f24b]" />
          <span className="tabular-nums">{formatUsd(creditUsd)}</span>
        </Link>

        {isFlowRunning ? (
          <button
            type="button"
            onClick={onStopFlow}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border border-rose-500/40 bg-rose-500/15 px-3 text-xs font-bold text-rose-200 transition hover:bg-rose-500/25"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>
              {flowWaveProgress
                ? `${isZh ? "停止" : "Stop"} (${flowWaveProgress.current}/${flowWaveProgress.total})`
                : isZh
                  ? "停止流程"
                  : "Stop"}
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled={flowModelCount === 0}
            onClick={onRunFlow}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] px-3.5 text-xs font-bold transition ${
              flowModelCount > 0
                ? "bg-[#c6f24b] text-[#11141b] shadow-[0_6px_18px_rgba(198,242,75,0.22)] hover:brightness-105"
                : "cursor-not-allowed bg-white/8 text-white/35"
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Run Flow</span>
          </button>
        )}
      </div>
    </header>
    {libraryOpen ? (
      <CanvasLibraryDialog
        locale={locale}
        projects={projects}
        folders={folders}
        activeProjectId={activeProjectId}
        onClose={() => setLibraryOpen(false)}
        onOpen={onSelectProject}
        onCreate={(folderId) => {
          setLibraryOpen(false);
          onCreateProject(folderId);
        }}
        onRename={onRenameProject}
        onDelete={onDeleteProject}
        onMove={onMoveProject}
        onCreateFolder={onCreateFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
      />
    ) : null}
    </>
  );
}

function flowStatusLabel(status: CanvasFlowHeaderStatus, isZh: boolean): string {
  const failed =
    status.failedCount > 0
      ? isZh
        ? ` · ${status.failedCount} 個失敗`
        : ` · ${status.failedCount} failed`
      : "";
  if (status.status === "running") {
    if (status.scope === "nodes") {
      const running = isZh
        ? `${status.current} 個執行中`
        : status.current === 1
          ? "1 running"
          : `${status.current} running`;
      return `${running}${failed}`;
    }
    const wave = status.total > 0 ? ` ${status.current}/${status.total}` : "";
    return `${isZh ? "流程執行中" : "Flow running"}${wave}${failed}`;
  }
  if (status.status === "completed") {
    const wave = status.total > 0 ? ` ${status.current}/${status.total}` : "";
    return isZh ? `流程已完成${wave}` : `Flow finished${wave}`;
  }
  if (status.status === "failed") {
    if (status.scope === "flow") {
      return isZh
        ? `流程結束 · ${status.failedCount} 個失敗`
        : `Flow finished · ${status.failedCount} failed`;
    }
    return isZh ? `${status.failedCount} 個失敗` : `${status.failedCount} failed`;
  }
  const stopped = isZh ? "流程已停止" : "Flow stopped";
  return `${stopped}${failed}`;
}

function FlowStatusPill({
  status,
  isZh,
}: {
  status: CanvasFlowHeaderStatus | null;
  isZh: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  if (!status) return null;
  const label = flowStatusLabel(status, isZh);
  const tone =
    status.failedCount > 0 && status.status !== "running"
      ? "border-rose-400/40 bg-rose-500/12 text-rose-200"
      : status.status === "running"
        ? "border-[#c6f24b]/40 bg-[#c6f24b]/12 text-[#d6f58a]"
        : status.status === "completed"
          ? "border-emerald-400/35 bg-emerald-500/12 text-emerald-200"
          : "border-white/15 bg-white/6 text-white/70";
  const canList = status.failures.length > 0;
  const body = (
    <>
      {status.status === "running" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : status.status === "completed" ? (
        <Check className="h-3 w-3" />
      ) : status.status === "stopped" && status.failedCount === 0 ? (
        <Square className="h-2.5 w-2.5 fill-current" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {label}
      {canList ? <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} /> : null}
    </>
  );
  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {canList ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold ${tone}`}
        >
          {body}
        </button>
      ) : (
        <span className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold ${tone}`}>
          {body}
        </span>
      )}
      {canList && open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-80 rounded-xl border border-rose-400/30 bg-[#141820] p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          <p className="px-1 pb-1.5 text-[10px] font-semibold tracking-wide text-white/45">
            {isZh ? "失敗的節點" : "Failed nodes"}
          </p>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {status.failures.map((failure, index) => (
              <li key={`${failure.name}-${index}`} className="rounded-lg bg-rose-500/8 px-2 py-1.5">
                <p className="text-[12px] font-semibold text-rose-100">{failure.name}</p>
                {failure.error ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-rose-100/70">{failure.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
