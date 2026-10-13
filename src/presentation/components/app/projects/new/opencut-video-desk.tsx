"use client";

import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { OpenCutExportButton } from "@/presentation/components/app/projects/new/opencut-export-button";
import {
  getOpencutEditAction,
  saveOpencutEditAction,
  uploadOpencutMediaAction,
} from "@/presentation/actions/opencut-edit";
import { syncOpencutSubtitlePlatesAction } from "@/presentation/actions/opencut-subtitle";
import { timelineClips } from "@/service/video-edit/edit-timeline";
import { buildSubtitleCatalog, type SubtitleCatalog } from "@/service/video-edit/subtitle-catalog";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";
import { mediaSrc } from "@/util/media-src";
import type { OpencutEditMedia } from "@/model/opencut-edit";
import type { PublicTextStyle, PublicVideo } from "@/presentation/serialize";

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
export function OpenCutVideoDesk({
  project,
  textStyles,
}: {
  project: PublicVideo;
  textStyles: PublicTextStyle[];
}) {
  const { t } = useI18n();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const catalogRef = useRef<SubtitleCatalog | null>(null);
  const storyClips = project.phaseA?.clips;

  // Text styles and spoken lines for the iframe's subtitle panel.
  useEffect(() => {
    const catalog = buildSubtitleCatalog({
      clips: storyClips ?? [],
      subtitleLook: project.subtitleLook,
      textStyleId: project.textStyleId,
      textStyles,
      origin: window.location.origin,
      label: (look) => subtitleLookLabel(t, look).label,
      ui: {
        subtitles: t("video.opencut.subtitles"),
        hint: t("video.opencut.subtitleHint"),
        generate: t("video.opencut.generate"),
        generating: t("video.opencut.generating"),
        placed: t("video.opencut.placed"),
        placedPartial: t("video.opencut.placedPartial"),
        noLines: t("video.opencut.noLines"),
        noMatch: t("video.opencut.noMatch"),
      },
    });
    catalogRef.current = catalog;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "scro-subtitle-catalog", videoId: project.id, catalog },
      new URL(OPENCUT_ORIGIN).origin,
    );
  }, [project.id, project.subtitleLook, project.textStyleId, storyClips, textStyles, t]);
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

    const postCatalog = () => {
      const catalog = catalogRef.current;
      if (!catalog) return;
      post({ type: "scro-subtitle-catalog", videoId: project.id, catalog });
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

    const runSubtitleGenerate = async (payload: {
      videoId: string;
      textStyleId: string;
      clipNumbers: number[];
    }) => {
      if (payload.videoId !== project.id) return;
      const wanted = [...new Set(payload.clipNumbers)];
      const urlByClip = new Map<number, string>();
      const deadline = Date.now() + 8 * 60 * 1000;
      let lastError: string | undefined;

      while (Date.now() < deadline) {
        const missing = wanted.filter((clipNumber) => !urlByClip.has(clipNumber));
        if (missing.length === 0) break;

        const result = await syncOpencutSubtitlePlatesAction({
          videoId: payload.videoId,
          textStyleId: payload.textStyleId,
          clipNumbers: missing,
        });
        if (!result.ok) {
          lastError = result.error;
          break;
        }
        for (const plate of result.plates) {
          urlByClip.set(plate.clipNumber, plate.url);
        }
        if (result.failed.length > 0) {
          lastError = result.failed.map((item) => item.error).join("；");
          break;
        }
        if (result.pending.length === 0 && missing.some((clipNumber) => !urlByClip.has(clipNumber))) {
          lastError = "部分字幕圖無法產生";
          break;
        }
        if (result.pending.length === 0) break;
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      if (!lastError && wanted.some((clipNumber) => !urlByClip.has(clipNumber))) {
        lastError = "字幕圖產生逾時";
      }

      post({
        type: "scro-subtitle-generate-result",
        videoId: payload.videoId,
        ok: !lastError && wanted.every((clipNumber) => urlByClip.has(clipNumber)),
        plates: wanted.flatMap((clipNumber) => {
          const url = urlByClip.get(clipNumber);
          return url ? [{ clipNumber, url }] : [];
        }),
        error: lastError,
      });
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as {
        type?: string;
        sourceUrls?: string[];
        videoId?: string;
        textStyleId?: string;
        clipNumbers?: number[];
        project?: unknown;
        media?: OpencutEditMedia[];
        uploads?: SaveUpload[];
      };
      if (data?.type === "scro-editor-ready") {
        readyRef.current = true;
        beginSync();
        postCatalog();
        return;
      }
      if (data?.type === "scro-subtitle-request") {
        postCatalog();
        return;
      }
      if (data?.type === "scro-subtitle-generate") {
        const clipNumbers = Array.isArray(data.clipNumbers)
          ? data.clipNumbers.filter((n): n is number => typeof n === "number" && Number.isInteger(n))
          : [];
        if (typeof data.videoId === "string" && typeof data.textStyleId === "string" && clipNumbers.length > 0) {
          void runSubtitleGenerate({
            videoId: data.videoId,
            textStyleId: data.textStyleId,
            clipNumbers,
          });
        }
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
