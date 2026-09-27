"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { VideoEditExport } from "@/presentation/components/app/projects/new/video-edit-export";
import { VideoEditLayers } from "@/presentation/components/app/projects/new/video-edit-layers";
import { VideoEditPreview, type EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";
import { VideoEditProperties } from "@/presentation/components/app/projects/new/video-edit-properties";
import { VideoEditTemplates } from "@/presentation/components/app/projects/new/video-edit-templates";
import {
  applyTemplateAction,
  deleteTemplateAction,
  exportFinalVideoAction,
  listTemplatesAction,
  overwriteTemplateAction,
  renameTemplateAction,
  saveTemplateAction,
  updateVideoEditAction,
} from "@/presentation/actions/video-edit";
import { isReelBusy, isReelCurrent } from "@/service/reel/fingerprint";
import { EDIT_LIMITS, emptyEdit, type BookendClip, type BrandLayer, type VideoEdit } from "@/model/video-edit";
import type { PublicTemplate, PublicVideo } from "@/presentation/serialize";

const SAVE_DELAY_MS = 600;

// Video tab: local edit state is the source of truth; it autosaves to the
// video after a short pause and flushes before template or export actions.
export function VideoEditDesk({
  project,
  pending,
  error,
  onComposeReel,
  onProjectChange,
}: {
  project: PublicVideo;
  pending: string;
  error: string;
  onComposeReel: () => void;
  onProjectChange: (project: PublicVideo) => void;
}) {
  const [edit, setEdit] = useState<VideoEdit>(() => project.edit ?? emptyEdit());
  const [selected, setSelected] = useState<EditSelection>("");
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef<number | null>(null);
  const dirty = useRef(false);
  const latest = useRef(edit);
  useEffect(() => {
    latest.current = edit;
  }, [edit]);

  // Same auto-compose rule the old reel inspector used.
  const reelCurrent = isReelCurrent(project);
  const reelBusy = isReelBusy(project.reelStatus) || pending === "reel";
  const reelFailed = project.reelStatus === "failed" && !reelCurrent;
  useEffect(() => {
    if (reelCurrent || reelBusy || reelFailed) return;
    onComposeReel();
  }, [reelCurrent, reelBusy, reelFailed, onComposeReel]);

  useEffect(() => {
    void listTemplatesAction().then((result) => {
      if (result.ok) setTemplates(result.templates);
    });
  }, []);

  const save = useCallback(async () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return true;
    dirty.current = false;
    setSaving(true);
    const result = await updateVideoEditAction(project.id, latest.current);
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error);
      return false;
    }
    onProjectChange(result.project);
    return true;
  }, [project.id, onProjectChange]);

  function change(next: (current: VideoEdit) => VideoEdit) {
    setEdit((current) => next(current));
    dirty.current = true;
    setMessage("");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
  }

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  function patchLayer(id: string, patch: Partial<BrandLayer>) {
    change((current) => ({ ...current, layers: current.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }

  function addLayer(url: string) {
    const layer: BrandLayer = { id: crypto.randomUUID(), kind: "image", assetUrl: url, anchor: "top-right", marginPct: 4, widthPct: 18, opacity: 1 };
    change((current) => ({ ...current, layers: [...current.layers, layer] }));
    setSelected(layer.id);
  }

  function moveLayer(id: string, delta: -1 | 1) {
    change((current) => {
      const layers = [...current.layers];
      const from = layers.findIndex((l) => l.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= layers.length) return current;
      [layers[from], layers[to]] = [layers[to], layers[from]];
      return { ...current, layers };
    });
  }

  function setBookend(slot: "intro" | "outro", asset: { url: string; kind: "image" | "video" }) {
    const clip: BookendClip = { kind: asset.kind, assetUrl: asset.url, durationSec: EDIT_LIMITS.imageDurationSec.default };
    change((current) => ({ ...current, [slot]: clip }));
    setSelected(slot);
  }

  function removeBookend(slot: "intro" | "outro") {
    change((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
    if (selected === slot) setSelected("");
  }

  // Template and export actions run after the pending autosave lands.
  async function run<T>(work: () => Promise<T>) {
    setBusy(true);
    const saved = await save();
    const result = saved ? await work() : undefined;
    setBusy(false);
    return result;
  }

  async function applyTemplate(templateId: string) {
    const result = await run(() => applyTemplateAction(project.id, templateId));
    if (!result) return;
    if (!result.ok) return setMessage(result.error);
    setEdit(result.project.edit ?? emptyEdit());
    setSelected("");
    onProjectChange(result.project);
  }

  async function saveNew(name: string) {
    const result = await run(() => saveTemplateAction(project.id, name));
    if (!result) return "儲存失敗，請再試一次";
    if (!result.ok) return result.error;
    setTemplates((list) => [result.template, ...list]);
    onProjectChange(result.project);
    return "";
  }

  async function overwrite(templateId: string) {
    const result = await run(() => overwriteTemplateAction(project.id, templateId));
    if (!result) return;
    if (!result.ok) return setMessage(result.error);
    setTemplates((list) => list.map((t) => (t.id === templateId ? result.template : t)));
  }

  async function rename(templateId: string, name: string) {
    const result = await renameTemplateAction(templateId, name);
    if (!result.ok) return result.error;
    setTemplates((list) => list.map((t) => (t.id === templateId ? result.template : t)));
    return "";
  }

  async function remove(templateId: string) {
    const result = await deleteTemplateAction(templateId);
    if (!result.ok) return setMessage(result.error);
    setTemplates((list) => list.filter((t) => t.id !== templateId));
  }

  async function exportVideo() {
    const result = await run(() => exportFinalVideoAction(project.id));
    if (!result) return;
    if (!result.ok) return setMessage(result.error);
    onProjectChange(result.project);
  }

  const shownError = message || error || (reelFailed ? project.reelError || "成片合成失敗" : "");

  return (
    <StudioFrame
      preview={
        <VideoEditPreview
          reelUrl={reelCurrent ? project.reelUrl : undefined}
          aspectRatio={project.aspectRatio}
          edit={edit}
          selected={selected}
          onSelect={setSelected}
          onLayerChange={patchLayer}
        />
      }
      inspector={
        <div className="flex flex-col gap-5 p-4">
          <header>
            <p className="text-sm font-semibold">Video</p>
            <p className="mt-1 text-xs text-[var(--studio-muted)]">
              {saving ? "儲存中…" : "加 logo、開頭與結尾，存成樣板下次一鍵套用。"}
            </p>
          </header>
          <VideoEditTemplates
            templates={templates}
            edit={edit}
            editTemplateId={project.editTemplateId}
            busy={busy}
            onApply={(id) => void applyTemplate(id)}
            onSaveNew={saveNew}
            onOverwrite={(id) => void overwrite(id)}
            onRename={rename}
            onDelete={(id) => void remove(id)}
          />
          <VideoEditLayers
            edit={edit}
            selected={selected}
            busy={busy}
            onSelect={setSelected}
            onAddLayer={addLayer}
            onRemoveLayer={(id) => {
              change((current) => ({ ...current, layers: current.layers.filter((l) => l.id !== id) }));
              if (selected === id) setSelected("");
            }}
            onMoveLayer={moveLayer}
            onSetBookend={setBookend}
            onRemoveBookend={removeBookend}
            onError={setMessage}
          />
          <VideoEditProperties
            edit={edit}
            selected={selected}
            onLayerChange={patchLayer}
            onBookendChange={(slot, patch) =>
              change((current) => (current[slot] ? { ...current, [slot]: { ...current[slot]!, ...patch } } : current))
            }
          />
          <VideoEditExport project={project} edit={edit} saving={saving || busy} pending={busy} onExport={() => void exportVideo()} />
          {reelFailed ? (
            <button type="button" onClick={onComposeReel} className="self-start text-xs font-semibold text-[var(--studio-teal)]">重新合成成片</button>
          ) : null}
          {shownError ? <p role="alert" className="text-xs font-medium text-[#e11d48]">{shownError}</p> : null}
        </div>
      }
    />
  );
}
