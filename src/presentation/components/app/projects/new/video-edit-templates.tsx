"use client";

import { useState } from "react";
import { StudioButton } from "@/presentation/studio/studio-button";
import { TemplateNameDialog } from "@/presentation/components/app/projects/new/template-name-dialog";
import { hasEdit, isEditDirty } from "@/service/video-edit/edit-state";
import type { PublicTemplate } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";

type Dialog = { mode: "new" } | { mode: "rename"; template: PublicTemplate } | null;

// Template picker, save-as-new, overwrite-source, rename, delete.
export function VideoEditTemplates({
  templates,
  edit,
  editTemplateId,
  busy,
  onApply,
  onSaveNew,
  onOverwrite,
  onRename,
  onDelete,
}: {
  templates: PublicTemplate[];
  edit: VideoEdit;
  editTemplateId?: string;
  busy: boolean;
  onApply: (templateId: string) => void;
  onSaveNew: (name: string) => Promise<string>;
  onOverwrite: (templateId: string) => void;
  onRename: (templateId: string, name: string) => Promise<string>;
  onDelete: (templateId: string) => void;
}) {
  const [picked, setPicked] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogError, setDialogError] = useState("");
  const [dialogPending, setDialogPending] = useState(false);
  const [managing, setManaging] = useState(false);
  const source = templates.find((template) => template.id === editTemplateId);
  const canOverwrite = Boolean(source && hasEdit(edit) && isEditDirty(edit, source));

  async function submitDialog(name: string) {
    if (!dialog) return;
    setDialogPending(true);
    const error = dialog.mode === "new" ? await onSaveNew(name) : await onRename(dialog.template.id, name);
    setDialogPending(false);
    if (error) setDialogError(error);
    else setDialog(null);
  }

  function confirmOverwrite() {
    if (!source) return;
    if (window.confirm(`會覆寫〈${source.name}〉，之前套用過的影片不會變。`)) onOverwrite(source.id);
  }

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">樣板</h3>
      <div className="flex gap-2">
        <select
          value={picked}
          onChange={(event) => setPicked(event.target.value)}
          className="min-h-9 min-w-0 flex-1 rounded-lg border border-[var(--studio-line)] px-2 text-sm"
        >
          <option value="">{templates.length ? "選擇樣板…" : "還沒有樣板"}</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
        <StudioButton variant="ghost" disabled={!picked || busy} onClick={() => onApply(picked)}>套用</StudioButton>
      </div>
      <div className="flex flex-wrap gap-2">
        <StudioButton
          variant="ghost"
          className="min-h-8 text-xs"
          disabled={!hasEdit(edit) || busy}
          onClick={() => {
            setDialogError("");
            setDialog({ mode: "new" });
          }}
        >
          儲存為新樣板
        </StudioButton>
        {canOverwrite && source ? (
          <StudioButton className="min-h-8 text-xs" disabled={busy} onClick={confirmOverwrite}>
            更新樣板〈{source.name}〉
          </StudioButton>
        ) : null}
        {templates.length ? (
          <button type="button" onClick={() => setManaging((v) => !v)} className="text-xs font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-ink)]">
            {managing ? "完成" : "管理"}
          </button>
        ) : null}
      </div>
      {managing ? (
        <ul className="space-y-1 rounded-lg bg-[var(--studio-fill)] p-2 text-xs">
          {templates.map((template) => (
            <li key={template.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{template.name}</span>
              <button type="button" className="font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-ink)]" onClick={() => { setDialogError(""); setDialog({ mode: "rename", template }); }}>改名</button>
              <button type="button" className="font-semibold text-[#e11d48]" onClick={() => { if (window.confirm(`刪除〈${template.name}〉？已套用的影片不受影響。`)) onDelete(template.id); }}>刪除</button>
            </li>
          ))}
        </ul>
      ) : null}
      {dialog ? (
        <TemplateNameDialog
          title={dialog.mode === "new" ? "儲存為新樣板" : "樣板改名"}
          initialName={dialog.mode === "rename" ? dialog.template.name : ""}
          submitLabel={dialog.mode === "new" ? "儲存" : "改名"}
          pending={dialogPending}
          error={dialogError}
          onSubmit={(name) => void submitDialog(name)}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </section>
  );
}
