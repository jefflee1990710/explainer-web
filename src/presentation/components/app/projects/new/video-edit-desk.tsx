"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioFrame } from "@/presentation/studio/studio-frame";
import { BookendVideoDialog } from "@/presentation/components/app/projects/new/bookend-video-dialog";
import { VideoEditCoverDialog } from "@/presentation/components/app/projects/new/video-edit-cover-dialog";
import { VideoEditExportBar } from "@/presentation/components/app/projects/new/video-edit-export-bar";
import { VideoEditPreview, type EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";
import { VideoEditSummaryEnd } from "@/presentation/components/app/projects/new/video-edit-summary-end";
import type { EditSlot } from "@/presentation/components/app/projects/new/video-edit-timeline";
import { useI18n } from "@/presentation/components/i18n-provider";
import { updateVideoEditAction } from "@/presentation/actions/video-edit";
import {
  downloadRemoteFile,
  downloadVideoFile,
  ExportCancelled,
  renderVideoInBrowser,
  type ExportJob,
} from "@/presentation/components/app/projects/new/browser-video-export";
import { ExportProgressOverlay } from "@/presentation/components/app/projects/new/export-progress-overlay";
import { clipUrlsForExport, timelineClips } from "@/service/video-edit/edit-timeline";
import { setTransition } from "@/service/video-edit/edit-transition";
import { EDIT_LIMITS, emptyEdit, type BookendClip, type BrandLayer, type VideoEdit } from "@/model/video-edit";
import { displayMediaSrc } from "@/util/media-src";
import type { PublicVideo } from "@/presentation/serialize";

const SAVE_DELAY_MS = 600;

export function VideoEditDesk({
  project,
  credits,
  error,
  onProjectChange,
  onCreditsChange,
}: {
  project: PublicVideo;
  credits: number;
  error: string;
  onProjectChange: (project: PublicVideo) => void;
  onCreditsChange?: (delta: number) => void;
}) {
  const { t } = useI18n();
  const [edit, setEdit] = useState<VideoEdit>(() => project.edit ?? emptyEdit());
  const [selected, setSelected] = useState<EditSelection>("clip-1");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [slotDialog, setSlotDialog] = useState<EditSlot | null>(null);
  const exportAbort = useRef<AbortController | null>(null);
  // Set when Video + Cover is waiting on a still that does not exist yet.
  const coverExport = useRef<{ filename: string; videoUrl: string | undefined } | null>(null);
  const coverQueued = useRef(false);
  const [coverForExport, setCoverForExport] = useState(false);
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

  // Cover file first, then the same video export. The mp4 name gets a -cover suffix.
  async function exportVideoAndCover(coverUrl: string, existingUrl: string | undefined, filename: string) {
    const coverName = `${filename.replace(/\.mp4$/i, "")}-cover.jpg`;
    try {
      await downloadRemoteFile(coverUrl, coverName);
    } catch {
      setMessage(t("video.export.coverDownloadFailed"));
    }
    await exportVideo(existingUrl, filename);
  }

  function requestVideoAndCover(existingUrl: string | undefined, filename: string) {
    if (project.coverUrl && project.coverStatus !== "generating") {
      void exportVideoAndCover(project.coverUrl, existingUrl, filename);
      return;
    }
    coverQueued.current = false;
    coverExport.current = { filename, videoUrl: existingUrl };
    setCoverForExport(true);
    setSlotDialog("cover");
  }

  useEffect(() => {
    const job = coverExport.current;
    if (!job) return;
    if (project.coverStatus === "failed" || project.coverStatus === "generating" || !project.coverUrl) return;
    const url = project.coverUrl;
    coverExport.current = null;
    coverQueued.current = false;
    // The still arrives from the project poll, so this is the handoff into download.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoverForExport(false);
    setSlotDialog(null);
    void exportVideoAndCover(url, job.videoUrl, job.filename);
    // exportVideoAndCover is current on the render that sees the finished cover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.coverUrl, project.coverStatus]);

  const shownError = message || error;

  return (
    <>
    <VideoEditSummaryEnd>
      <VideoEditExportBar
        project={project}
        edit={edit}
        saving={saving || busy}
        pending={busy}
        error={shownError}
        onVideoOnly={(url, filename) => void exportVideo(url, filename)}
        onVideoAndCover={requestVideoAndCover}
      />
    </VideoEditSummaryEnd>
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
          coverUrl={project.coverUrl}
          coverBusy={project.coverStatus === "generating"}
          onOpenSlot={setSlotDialog}
        />
      }
    />
    {exportJob ? <ExportProgressOverlay job={exportJob} onCancel={cancelExport} /> : null}
    {slotDialog === "cover" ? (
      <VideoEditCoverDialog
        project={project}
        credits={credits}
        onProjectChange={onProjectChange}
        onCreditsChange={onCreditsChange}
        forExport={coverForExport}
        onExportQueued={() => {
          coverQueued.current = true;
        }}
        onClose={() => {
          if (project.coverStatus !== "generating") {
            coverExport.current = null;
            coverQueued.current = false;
            setCoverForExport(false);
          }
          setSlotDialog(null);
        }}
      />
    ) : null}
    {slotDialog === "intro" || slotDialog === "outro" ? (
      <BookendVideoDialog
        slot={slotDialog}
        current={edit[slotDialog]}
        busy={busy}
        onSelect={(pick) => {
          setBookend(slotDialog, { url: pick.videoUrl, kind: "video", durationSec: pick.durationSec });
          setSlotDialog(null);
        }}
        onUploaded={(asset) => {
          setBookend(slotDialog, asset);
          setSlotDialog(null);
        }}
        onRemove={
          edit[slotDialog]
            ? () => {
                removeBookend(slotDialog);
                setSlotDialog(null);
              }
            : undefined
        }
        onClose={() => setSlotDialog(null)}
      />
    ) : null}
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
