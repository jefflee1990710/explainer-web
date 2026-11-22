"use client";

// Top bar for /app/canvas: app menu, project switcher, Editor/Agent layout,
// Fit View, USD credit badge, and primary Run Flow button.

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  FolderPlus,
  Loader2,
  Maximize,
  Menu,
  PanelLeftClose,
  Pencil,
  Play,
  Square,
  Trash2,
  Wallet,
} from "lucide-react";
import { CanvasViewLayoutSwitch } from "@/app/app/canvas/canvas-view-layout-switch";
import type { CanvasViewLayout } from "@/app/app/canvas/canvas-view-layout";
import { useStudioChrome } from "@/presentation/studio/studio-chrome";
import { formatUsd } from "@/service/billing/usd";
import type { CanvasProjectSummaryDto } from "@/service/canvas/projects";

export type SaveStatus = "saved" | "saving" | "dirty" | "error";

export function CanvasTopbar({
  locale,
  projects,
  activeProjectId,
  activeTitle,
  saveStatus,
  creditUsd,
  viewLayout,
  flowModelCount,
  isFlowRunning,
  flowWaveProgress,
  onViewLayout,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onFitView,
  onRunFlow,
  onStopFlow,
}: {
  locale: string;
  projects: readonly CanvasProjectSummaryDto[];
  activeProjectId: string;
  activeTitle: string;
  saveStatus: SaveStatus;
  creditUsd: number;
  viewLayout: CanvasViewLayout;
  flowModelCount: number;
  isFlowRunning: boolean;
  flowWaveProgress: { current: number; total: number } | null;
  onViewLayout: (layout: CanvasViewLayout) => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onRenameProject: (nextTitle: string) => void;
  onDeleteProject: (projectId: string) => void;
  onFitView: () => void;
  onRunFlow: () => void;
  onStopFlow: () => void;
}) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const { railHidden, toggleRail } = useStudioChrome();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(activeTitle);

  function startRename() {
    setDraftTitle(activeTitle);
    setEditingTitle(true);
    setProjectsOpen(false);
  }

  function commitRename() {
    const trimmed = draftTitle.trim();
    setEditingTitle(false);
    if (trimmed && trimmed !== activeTitle) {
      onRenameProject(trimmed);
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
    <header className="relative z-30 flex h-13 shrink-0 items-center justify-between gap-2 border-b border-white/8 bg-[#0e121a]/95 px-3 backdrop-blur-md">
      {/* Left: sidebar toggle, project switcher, inline rename, save pill */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleRail}
          title={railHidden ? (isZh ? "開啟選單" : "Open menu") : isZh ? "關閉選單" : "Close menu"}
          aria-pressed={!railHidden}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-white/10 bg-white/5 text-white/75 transition hover:border-white/20 hover:text-white"
        >
          {railHidden ? <Menu className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        {editingTitle ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              autoFocus
              className="h-8 w-48 rounded-[9px] border border-[#c6f24b]/60 bg-[#0a0d13] px-2.5 text-xs font-semibold text-white focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitRename}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] bg-[#c6f24b] text-[#11141b]"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setProjectsOpen((v) => !v)}
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

            {projectsOpen ? (
              <div className="absolute top-10 left-0 z-40 w-72 overflow-hidden rounded-[14px] border border-white/12 bg-[#12161f] p-1.5 shadow-2xl">
                <div className="flex items-center justify-between px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/45">
                  <span>{isZh ? "我的畫布專案" : "My Canvases"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProjectsOpen(false);
                      onCreateProject();
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#c6f24b]/15 px-2 py-0.5 text-[10.5px] font-bold text-[#c6f24b] transition hover:bg-[#c6f24b]/25"
                  >
                    <FolderPlus className="h-3 w-3" />
                    {isZh ? "新建" : "New"}
                  </button>
                </div>
                <div className="max-h-64 space-y-0.5 overflow-y-auto">
                  {projects.map((proj) => {
                    const isActive = proj.id === activeProjectId;
                    return (
                      <div
                        key={proj.id}
                        className={`group flex items-center justify-between gap-2 rounded-[10px] px-2 py-1.5 text-xs transition ${
                          isActive
                            ? "bg-[#c6f24b]/12 text-[#c6f24b]"
                            : "text-white/80 hover:bg-white/6"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setProjectsOpen(false);
                            if (!isActive) onSelectProject(proj.id);
                          }}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                        >
                          {proj.thumbnailUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={proj.thumbnailUrl}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-md object-cover ring-1 ring-white/10"
                            />
                          ) : (
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/6 text-[10px] font-bold text-white/45">
                              {proj.nodeCount}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {proj.title}
                          </span>
                        </button>
                        {projects.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setProjectsOpen(false);
                              onDeleteProject(proj.id);
                            }}
                            title={isZh ? "刪除畫布" : "Delete canvas"}
                            className="cursor-pointer rounded-md p-1 text-white/35 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
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
      </div>

      {/* Center: Editor / Agent layout, then Fit View */}
      <div className="flex items-center gap-1.5">
        <CanvasViewLayoutSwitch locale={locale} layout={viewLayout} onChange={onViewLayout} />
        <button
          type="button"
          onClick={onFitView}
          title={isZh ? "縮放至全部節點" : "Fit view"}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-[10px] border border-white/10 bg-white/5 text-white/75 transition hover:border-white/20 hover:text-white"
        >
          <Maximize className="h-3.5 w-3.5" />
        </button>
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
  );
}
