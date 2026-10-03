"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { VideoEditExport } from "@/presentation/components/app/projects/new/video-edit-export";
import { VideoSharePanel } from "@/presentation/components/app/projects/new/video-share-panel";
import { VideoEditLayers } from "@/presentation/components/app/projects/new/video-edit-layers";
import { VideoEditPreview, type EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";
import { VideoEditProperties } from "@/presentation/components/app/projects/new/video-edit-properties";
import { useI18n } from "@/presentation/components/i18n-provider";
import { updateVideoEditAction } from "@/presentation/actions/video-edit";
import {
  downloadVideoFile,
  ExportCancelled,
  renderVideoInBrowser,
  type ExportJob,
} from "@/presentation/components/app/projects/new/browser-video-export";
import { ExportProgressOverlay } from "@/presentation/components/app/projects/new/export-progress-overlay";
import { clipUrlsForExport, timelineClips } from "@/service/video-edit/edit-timeline";
import { setTransition } from "@/service/video-edit/edit-transition";
import { EDIT_LIMITS, emptyEdit, type BookendClip, type BrandLayer, type VideoEdit } from "@/model/video-edit";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { displayMediaSrc } from "@/util/media-src";
import type { PublicVideo } from "@/presentation/serialize";

const SAVE_DELAY_MS = 600;

export function VideoEditDesk({
  project,
  error,
  onProjectChange,
}: {
  project: PublicVideo;
  error: string;
  onProjectChange: (project: PublicVideo) => void;
}) {
  const { t } = useI18n();
  const [edit, setEdit] = useState<VideoEdit>(() => project.edit ?? emptyEdit());
  const [selected, setSelected] = useState<EditSelection>("clip-1");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const exportAbort = useRef<AbortController | null>(null);
  const timer = useRef<number | null>(null);
  const dirty = useRef(false);
  const latest = useRef(edit);
  useEffect(() => {
    latest.current = edit;
  }, [edit]);

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

  function setBookend(slot: "intro" | "outro", asset: { url: string; kind: "image" | "video"; durationSec?: number }) {
    const durationSec = Math.min(
      EDIT_LIMITS.imageDurationSec.max,
      Math.max(EDIT_LIMITS.imageDurationSec.min, Math.round(asset.durationSec ?? EDIT_LIMITS.imageDurationSec.default)),
    );
    const clip: BookendClip = { kind: asset.kind, assetUrl: asset.url, durationSec };
    change((current) => ({ ...current, [slot]: clip }));
    setSelected(slot);
  }

  function removeBookend(slot: "intro" | "outro") {
    change((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
    if (selected === slot) setSelected("clip-1");
  }

  async function exportVideo(existingUrl: string | undefined, filename: string) {
    if (exportAbort.current) return;
    const controller = new AbortController();
    exportAbort.current = controller;
    setBusy(true);
    setMessage("");
    setExportJob({
      phase: existingUrl ? "download" : "encoder",
      ratio: 0,
      phases: existingUrl ? ["download", "save"] : ["encoder", "download", "encode", "save"],
    });
    try {
      const saved = await save();
      if (!saved || controller.signal.aborted) return;
      if (existingUrl) {
        await downloadVideoFile(existingUrl, filename, setExportJob, controller.signal);
      } else {
        const exportClips = [...project.clips]
          .sort((a, b) => a.clipNumber - b.clipNumber)
          .filter((clip) => clip.blobUrl || clip.outputUrl);
        const clipUrls = clipUrlsForExport(exportClips);
        if (clipUrls.length === 0) {
          setMessage(t("video.export.failed"));
          return;
        }
        await renderVideoInBrowser(
          clipUrls,
          edit,
          filename,
          setExportJob,
          controller.signal,
          exportClips.map((clip) => clip.clipNumber),
        );
      }
    } catch (error) {
      if (!(error instanceof ExportCancelled)) setMessage(t("video.export.failed"));
    } finally {
      setBusy(false);
      setExportJob(null);
      exportAbort.current = null;
    }
  }

  function cancelExport() {
    exportAbort.current?.abort();
  }

  const shownError = message || error;

  return (
    <>
    <StudioFrame
      preview={
        <VideoEditPreview
          clips={timelineClips(project)}
          posters={clipPosters(project)}
          aspectRatio={project.aspectRatio}
          edit={edit}
          selected={selected}
          onSelect={setSelected}
          onLayerChange={patchLayer}
          onTransitionChange={(fromId, toId, transition) =>
            change((current) => setTransition(current, fromId, toId, transition))
          }
        />
      }
      inspector={
        <div className="flex flex-col gap-5 p-4">
          <header>
            <p className="text-sm font-semibold">{t("video.edit.title")}</p>
            <p className="mt-1 text-xs text-[var(--studio-muted)]">
              {saving ? t("video.edit.subtitleSaving") : t("video.edit.subtitle")}
            </p>
          </header>
          <VideoSharePanel project={project} edit={edit} />
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
          <VideoEditExport project={project} edit={edit} saving={saving || busy} pending={busy} onExport={(url, filename) => void exportVideo(url, filename)} />
          {shownError ? (
            <p role="alert" className="text-xs font-medium text-[#e11d48]">
              {translateAppError(shownError, t)}
            </p>
          ) : null}
        </div>
      }
    />
    {exportJob ? <ExportProgressOverlay job={exportJob} onCancel={cancelExport} /> : null}
    </>
  );
}

// Start still per clip, used as timeline posters.
function clipPosters(project: PublicVideo) {
  return project.frames
    .filter((item) => item.position === "start")
    .map((item) => ({ clipNumber: item.clipNumber, src: displayMediaSrc(item) }))
    .filter((item): item is { clipNumber: number; src: string } => Boolean(item.src));
}
