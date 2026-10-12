"use client";

import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { OpenCutExportButton } from "@/presentation/components/app/projects/new/opencut-export-button";
import {
  getOpencutEditAction,
  saveOpencutEditAction,
  uploadOpencutMediaAction,
} from "@/presentation/actions/opencut-edit";
import { timelineClips } from "@/service/video-edit/edit-timeline";
import { mediaSrc } from "@/util/media-src";
import type { OpencutEditMedia } from "@/model/opencut-edit";
import type { PublicVideo } from "@/presentation/serialize";

// Vendored editor in opencut/apps/web. Override with NEXT_PUBLIC_OPENCUT_URL when it is hosted.
const OPENCUT_ORIGIN = process.env.NEXT_PUBLIC_OPENCUT_URL || "http://localhost:3001";

type SavedEdit = {
  project: Record<string, unknown>;
  media: OpencutEditMedia[];
  updatedAt: string;
};

type SaveUpload = {
  id: string;
  name: string;
  type: OpencutEditMedia["type"];
  width?: number;
  height?: number;
  duration?: number;
  blob: Blob;
};

type SaveMessage = {
  type: "scro-project-save";
  videoId: string;
  project: unknown;
  media?: OpencutEditMedia[];
  uploads?: SaveUpload[];
};

// Video tab: OpenCut edits the clips that Production already rendered.
export function OpenCutVideoDesk({ project }: { project: PublicVideo }) {
  const { t } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const savedRef = useRef<SavedEdit | null>(null);
  const fetchedRef = useRef(false);
  const readyRef = useRef(false);
  const startedRef = useRef(false);
  const syncedRef = useRef(false);
  const savingRef = useRef(false);
  const pendingSave = useRef<SaveMessage | null>(null);
  const clips = useMemo(
    () =>
      timelineClips(project).flatMap((clip) => {
        const url = mediaSrc(clip);
        if (!url) return [];
        return [{ name: `Clip ${clip.clipNumber}`, url }];
      }),
    [project],
  );
  const clipsRef = useRef(clips);
  clipsRef.current = clips;

  useEffect(() => {
    const origin = new URL(OPENCUT_ORIGIN).origin;
    let cancel = false;

    const post = (message: unknown) => {
      iframeRef.current?.contentWindow?.postMessage(message, origin);
    };

    const beginSync = () => {
      if (startedRef.current || !fetchedRef.current || !readyRef.current) return;
      startedRef.current = true;
      const saved = savedRef.current;
      if (saved) {
        post({
          type: "scro-restore",
          videoId: project.id,
          aspectRatio: project.aspectRatio,
          project: saved.project,
          media: saved.media,
          updatedAt: saved.updatedAt,
        });
        return;
      }
      post({
        type: "scro-import-clips",
        videoId: project.id,
        aspectRatio: project.aspectRatio,
        clips: clipsRef.current,
      });
      syncedRef.current = true;
    };

    const persist = async (data: SaveMessage) => {
      if (data.videoId !== project.id) return;
      if (savingRef.current) {
        pendingSave.current = data;
        return;
      }
      savingRef.current = true;
      try {
        const uploaded: OpencutEditMedia[] = [];
        for (const item of data.uploads ?? []) {
          if (!item.blob || !item.id) continue;
          const body = new FormData();
          body.set("videoId", project.id);
          body.set("mediaId", item.id);
          body.set("file", new File([item.blob], item.name || "asset", { type: item.blob.type || "application/octet-stream" }));
          const result = await uploadOpencutMediaAction(body);
          if (!result.ok) continue;
          uploaded.push({
            id: item.id,
            name: item.name,
            type: item.type,
            sourceUrl: result.url,
            width: item.width,
            height: item.height,
            duration: item.duration,
          });
        }
        await saveOpencutEditAction({
          videoId: project.id,
          project: data.project,
          media: [...(data.media ?? []), ...uploaded],
        });
      } finally {
        savingRef.current = false;
        const next = pendingSave.current;
        pendingSave.current = null;
        if (next) void persist(next);
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as { type?: string; sourceUrls?: string[] } & Partial<SaveMessage>;
      if (data?.type === "scro-editor-ready") {
        readyRef.current = true;
        beginSync();
        return;
      }
      if (data?.type === "scro-restore-done") {
        syncedRef.current = true;
        const known = new Set(data.sourceUrls ?? []);
        const fresh = clipsRef.current.filter((clip) => !known.has(clip.url));
        if (fresh.length > 0) {
          post({
            type: "scro-import-clips",
            videoId: project.id,
            aspectRatio: project.aspectRatio,
            clips: fresh,
          });
        }
        return;
      }
      if (data?.type === "scro-project-save") {
        void persist(data as SaveMessage);
      }
    };

    window.addEventListener("message", onMessage);
    void getOpencutEditAction(project.id).then((result) => {
      if (cancel) return;
      fetchedRef.current = true;
      savedRef.current = result.ok ? result.edit : null;
      beginSync();
    });

    return () => {
      cancel = true;
      window.removeEventListener("message", onMessage);
    };
  }, [project.aspectRatio, project.id]);

  useEffect(() => {
    if (!syncedRef.current) return;
    const origin = new URL(OPENCUT_ORIGIN).origin;
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "scro-import-clips",
        videoId: project.id,
        aspectRatio: project.aspectRatio,
        clips,
      },
      origin,
    );
  }, [clips, project.aspectRatio, project.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--studio-canvas)]">
      <OpenCutExportButton project={project} iframeRef={iframeRef} disabled={clips.length === 0} />
      {clips.length === 0 ? (
        <p className="shrink-0 px-4 py-2 text-xs text-muted">{t("video.opencut.empty")}</p>
      ) : null}
      <iframe
        ref={iframeRef}
        title="OpenCut"
        src={`${OPENCUT_ORIGIN}/editor/scro-${project.id}?embed=1`}
        className="min-h-0 w-full flex-1 border-0"
        allow="cross-origin-isolated; clipboard-read; clipboard-write"
      />
    </div>
  );
}
