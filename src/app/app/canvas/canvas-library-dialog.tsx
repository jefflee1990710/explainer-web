"use client";

// Canvas library: create, open, and file canvases into folders.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Folder, FolderPlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { canvasesInFolder, type CanvasFolderDto, type CanvasLibrarySelection } from "@/service/canvas/folder-library";
import type { CanvasProjectSummaryDto } from "@/service/canvas/projects";

type Props = {
  locale: string;
  projects: readonly CanvasProjectSummaryDto[];
  folders: readonly CanvasFolderDto[];
  activeProjectId: string;
  onClose: () => void;
  onOpen: (projectId: string) => void;
  onCreate: (folderId?: string) => void;
  onRename: (projectId: string, title: string) => void;
  onDelete: (projectId: string) => void;
  onMove: (projectId: string, folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
};

export function CanvasLibraryDialog({
  locale,
  projects,
  folders,
  activeProjectId,
  onClose,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  onMove,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: Props) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const active = projects.find((project) => project.id === activeProjectId);
  const [selection, setSelection] = useState<CanvasLibrarySelection>(active?.folderId ?? "all");
  const [query, setQuery] = useState("");
  const [draftFolder, setDraftFolder] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [folderDraft, setFolderDraft] = useState("");
  const [renamingCanvas, setRenamingCanvas] = useState<string | null>(null);
  const [canvasDraft, setCanvasDraft] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return canvasesInFolder(projects, selection).filter((project) => !q || project.title.toLowerCase().includes(q));
  }, [projects, selection, query]);

  const folderName =
    selection === "all"
      ? isZh
        ? "全部畫布"
        : "All canvases"
      : selection === "unfiled"
        ? isZh
          ? "未分類"
          : "Unfiled"
        : (folders.find((folder) => folder.id === selection)?.name ?? (isZh ? "資料夾" : "Folder"));

  function commitNewFolder() {
    const name = (draftFolder ?? "").trim();
    setDraftFolder(null);
    if (name) onCreateFolder(name);
  }

  function commitFolderRename(folderId: string) {
    const name = folderDraft.trim();
    setRenamingFolder(null);
    if (name) onRenameFolder(folderId, name);
  }

  function commitCanvasRename(projectId: string, current: string) {
    const name = canvasDraft.trim();
    setRenamingCanvas(null);
    if (name && name !== current) onRename(projectId, name);
  }

  const navButton = (id: CanvasLibrarySelection, label: string) => (
    <button
      type="button"
      onClick={() => setSelection(id)}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-xs font-medium transition ${
        selection === id ? "bg-[#c6f24b]/15 text-[#c6f24b]" : "text-white/75 hover:bg-white/6"
      }`}
    >
      <Folder className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex h-[min(720px,85vh)] w-[920px] max-w-full overflow-hidden rounded-2xl border border-white/15 bg-[#10141c] text-white shadow-2xl"
      >
        <aside className="flex w-[230px] shrink-0 flex-col border-r border-white/8 bg-[#0c1017] p-3">
          <div className="px-1 text-sm font-semibold">{isZh ? "畫布" : "Canvases"}</div>
          <div className="mt-3 space-y-1">
            {navButton("all", isZh ? "全部畫布" : "All canvases")}
            {navButton("unfiled", isZh ? "未分類" : "Unfiled")}
          </div>
          <div className="mt-4 flex items-center justify-between px-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">
              {isZh ? "資料夾" : "Folders"}
            </span>
            <button
              type="button"
              onClick={() => setDraftFolder("")}
              title={isZh ? "新增資料夾" : "New folder"}
              className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-white/55 transition hover:bg-white/8 hover:text-white"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {draftFolder !== null ? (
              <input
                autoFocus
                value={draftFolder}
                onChange={(event) => setDraftFolder(event.target.value)}
                onBlur={commitNewFolder}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitNewFolder();
                  if (event.key === "Escape") setDraftFolder(null);
                }}
                placeholder={isZh ? "資料夾名稱" : "Folder name"}
                className="h-8 w-full rounded-[8px] border border-[#c6f24b]/50 bg-[#0b0e14] px-2 text-xs text-white focus:outline-none"
              />
            ) : null}
            {folders.map((folder) =>
              renamingFolder === folder.id ? (
                <input
                  key={folder.id}
                  autoFocus
                  value={folderDraft}
                  onChange={(event) => setFolderDraft(event.target.value)}
                  onBlur={() => commitFolderRename(folder.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitFolderRename(folder.id);
                    if (event.key === "Escape") setRenamingFolder(null);
                  }}
                  className="h-8 w-full rounded-[8px] border border-[#c6f24b]/50 bg-[#0b0e14] px-2 text-xs text-white focus:outline-none"
                />
              ) : (
                <div key={folder.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelection(folder.id)}
                    className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-xs font-medium transition ${
                      selection === folder.id ? "bg-[#c6f24b]/15 text-[#c6f24b]" : "text-white/75 hover:bg-white/6"
                    }`}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button
                    type="button"
                    title={isZh ? "重新命名" : "Rename"}
                    onClick={() => {
                      setFolderDraft(folder.name);
                      setRenamingFolder(folder.id);
                    }}
                    className="hidden h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-white/40 group-hover:grid hover:bg-white/10 hover:text-white"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    title={isZh ? "刪除資料夾" : "Delete folder"}
                    onClick={() => {
                      if (window.confirm(isZh ? "刪除資料夾？裡面的畫布會回到未分類。" : "Delete this folder? Its canvases move to Unfiled.")) {
                        if (selection === folder.id) setSelection("unfiled");
                        onDeleteFolder(folder.id);
                      }
                    }}
                    className="hidden h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-white/40 group-hover:grid hover:bg-white/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ),
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{folderName}</div>
              <div className="text-[11px] text-white/45">
                {isZh ? `${visible.length} 個畫布` : `${visible.length} canvas${visible.length === 1 ? "" : "es"}`}
              </div>
            </div>
            <label className="flex h-8 w-48 items-center gap-1.5 rounded-[8px] border border-white/10 bg-[#0b0e14] px-2">
              <Search className="h-3.5 w-3.5 text-white/35" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isZh ? "搜尋" : "Search"}
                className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => onCreate(selection === "all" || selection === "unfiled" ? undefined : selection)}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-[#c6f24b] px-3 text-xs font-bold text-[#11141b] transition hover:brightness-105"
            >
              <Plus className="h-3.5 w-3.5" />
              {isZh ? "新增畫布" : "New canvas"}
            </button>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-xs text-white/45">
                {isZh ? "這個位置還沒有畫布" : "No canvases here yet"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {visible.map((project) => {
                  const isActive = project.id === activeProjectId;
                  const filed = folders.find((folder) => folder.id === project.folderId);
                  return (
                    <div
                      key={project.id}
                      className={`group relative flex flex-col rounded-[12px] border p-2.5 transition ${
                        isActive ? "border-[#c6f24b]/50 bg-[#c6f24b]/8" : "border-white/8 bg-white/3 hover:border-white/18"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!isActive) onOpen(project.id);
                          onClose();
                        }}
                        className="cursor-pointer text-left"
                      >
                        {project.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={project.thumbnailUrl} alt="" className="h-20 w-full rounded-[8px] object-cover" />
                        ) : (
                          <span className="grid h-20 w-full place-items-center rounded-[8px] bg-black/30 text-lg font-bold text-white/25">
                            {project.nodeCount}
                          </span>
                        )}
                        {renamingCanvas === project.id ? null : (
                          <span className="mt-2 block truncate text-xs font-semibold text-white/90">{project.title}</span>
                        )}
                        <span className="mt-0.5 block truncate text-[10.5px] text-white/40">
                          {filed?.name ?? (isZh ? "未分類" : "Unfiled")}
                          {isActive ? (isZh ? " · 開啟中" : " · Open") : ""}
                        </span>
                      </button>
                      {renamingCanvas === project.id ? (
                        <input
                          autoFocus
                          value={canvasDraft}
                          onChange={(event) => setCanvasDraft(event.target.value)}
                          onBlur={() => commitCanvasRename(project.id, project.title)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") commitCanvasRename(project.id, project.title);
                            if (event.key === "Escape") setRenamingCanvas(null);
                          }}
                          className="mt-2 h-7 w-full rounded-[7px] border border-[#c6f24b]/50 bg-[#0b0e14] px-2 text-xs text-white focus:outline-none"
                        />
                      ) : null}
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          type="button"
                          title={isZh ? "重新命名" : "Rename"}
                          onClick={() => {
                            setCanvasDraft(project.title);
                            setRenamingCanvas(project.id);
                          }}
                          className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-white/40 hover:bg-white/10 hover:text-white"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title={isZh ? "移動到資料夾" : "Move to folder"}
                          onClick={() => setMovingId((current) => (current === project.id ? null : project.id))}
                          className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-white/40 hover:bg-white/10 hover:text-white"
                        >
                          <Folder className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title={isZh ? "刪除畫布" : "Delete canvas"}
                          onClick={() => onDelete(project.id)}
                          className="ml-auto grid h-6 w-6 cursor-pointer place-items-center rounded-md text-white/40 hover:bg-white/10 hover:text-rose-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {movingId === project.id ? (
                        <div className="absolute right-2 bottom-10 z-10 w-40 rounded-[10px] border border-white/12 bg-[#161b26] p-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => {
                              onMove(project.id, null);
                              setMovingId(null);
                            }}
                            className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] text-white/80 hover:bg-white/8"
                          >
                            {isZh ? "未分類" : "Unfiled"}
                            {!project.folderId ? <Check className="h-3 w-3 text-[#c6f24b]" /> : null}
                          </button>
                          {folders.map((folder) => (
                            <button
                              key={folder.id}
                              type="button"
                              onClick={() => {
                                onMove(project.id, folder.id);
                                setMovingId(null);
                              }}
                              className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] text-white/80 hover:bg-white/8"
                            >
                              <span className="truncate">{folder.name}</span>
                              {project.folderId === folder.id ? <Check className="h-3 w-3 shrink-0 text-[#c6f24b]" /> : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
