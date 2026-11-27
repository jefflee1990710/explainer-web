"use client";

// Top bar for /app/canvas: project switcher, USD credit badge, and Run Flow.

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Loader2,
  Play,
  Square,
  Wallet,
} from "lucide-react";
import { CanvasHeaderFlowStatus } from "@/app/app/canvas/canvas-header-flow-status";
import { CanvasHeaderTitle } from "@/app/app/canvas/canvas-header-title";
import { CanvasLibraryDialog } from "@/app/app/canvas/canvas-library-dialog";
import { ComposedInput } from "@/app/app/canvas/nodes/composed-text-field";
import { formatUsd } from "@/service/billing/usd";
import type { CanvasFolderDto } from "@/model/canvas-dto";
import type { CanvasProjectSummaryDto } from "@/model/canvas-dto";
import type { CanvasFlowHeaderStatus } from "@/app/app/canvas/flow-header-status";

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
      {/* Centered live flow status. Sits above the side controls without a second bar. */}
      <CanvasHeaderFlowStatus status={flowStatus} isZh={isZh} />
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
          <CanvasHeaderTitle
            title={activeTitle}
            isZh={isZh}
            onOpenLibrary={() => setLibraryOpen(true)}
            onStartRename={startRename}
          />
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
