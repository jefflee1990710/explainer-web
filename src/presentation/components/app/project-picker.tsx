"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createFolderAction } from "@/presentation/actions/projects";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

export type ProjectOption = { id: string; name: string };

// "all" is the dashboard list. "none" is a video with no project.
export type ProjectPickerValue = "all" | "none" | string;

// Shared project menu: filter the video list, or choose a project while creating a video.
export function ProjectPicker({
  folders,
  value,
  onChange,
  onFolderCreated,
  includeAll = false,
  disabled = false,
}: {
  folders: ProjectOption[];
  value: ProjectPickerValue;
  onChange: (value: ProjectPickerValue) => void;
  onFolderCreated?: (folder: ProjectOption) => void;
  includeAll?: boolean;
  disabled?: boolean;
}) {
  const { locale } = useI18n();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const copy =
    locale === "zh-Hant"
      ? {
          all: "全部影片",
          none: "不放入專案",
          create: "新增專案",
          placeholder: "專案名稱",
          save: "建立",
          empty: "請輸入專案名稱",
        }
      : locale === "zh-Hans"
        ? {
            all: "全部视频",
            none: "不放入项目",
            create: "新建项目",
            placeholder: "项目名称",
            save: "创建",
            empty: "请输入项目名称",
          }
        : {
            all: "All videos",
            none: "No project",
            create: "New project",
            placeholder: "Project name",
            save: "Create",
            empty: "Enter a project name",
          };

  const selectedName =
    value === "all" ? copy.all : value === "none" || value === "" ? copy.none : folders.find((folder) => folder.id === value)?.name || copy.none;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: ProjectPickerValue) {
    onChange(next);
    setOpen(false);
    setCreating(false);
    setError("");
  }

  async function createProject() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(copy.empty);
      return;
    }
    setBusy(true);
    setError("");
    const result = await createFolderAction(trimmed);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onFolderCreated?.(result.folder);
    setName("");
    choose(result.folder.id);
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-30" : ""}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex max-w-full min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 text-left text-sm font-semibold transition hover:border-accent-ink/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">{selectedName}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div className="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-accent-ink/15 bg-paper p-1 shadow-[4px_4px_0_0_rgba(18,20,28,0.08)]">
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto">
            {includeAll ? (
              <Option active={value === "all"} onClick={() => choose("all")}>
                {copy.all}
              </Option>
            ) : null}
            <Option active={value === "none" || value === ""} onClick={() => choose("none")}>
              {copy.none}
            </Option>
            {folders.map((folder) => (
              <Option key={folder.id} active={value === folder.id} onClick={() => choose(folder.id)}>
                {folder.name}
              </Option>
            ))}
          </ul>
          <div className="border-t border-accent-ink/10 p-2">
            {creating ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void createProject();
                }}
                className="space-y-2"
              >
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={copy.placeholder}
                  className="w-full rounded-xl border border-accent-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent-ink"
                />
                {error ? <p className="text-xs font-medium text-accent">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-3 text-xs font-semibold text-lime disabled:opacity-60"
                >
                  {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
                  {copy.save}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCreating(true);
                  setError("");
                }}
                className="w-full cursor-pointer rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-accent-ink/5"
              >
                + {copy.create}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Option({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onClick}
        className={`block w-full cursor-pointer truncate rounded-xl px-3 py-2 text-left text-sm font-semibold ${
          active ? "bg-accent-ink text-lime" : "hover:bg-accent-ink/5"
        }`}
      >
        {children}
      </button>
    </li>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
