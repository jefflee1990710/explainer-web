"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { OpenCutExportButton } from "@/presentation/components/app/projects/new/opencut-export-button";
import {
  getOpencutEditAction,
  saveOpencutEditAction,
  uploadOpencutMediaAction,
} from "@/presentation/actions/opencut-edit";
import { syncOpencutSubtitlePlatesAction } from "@/presentation/actions/opencut-subtitle";
import { buildSubtitleCatalog, type SubtitleCatalog } from "@/service/video-edit/subtitle-catalog";
import { createScroOpenCutHost, type ScroOpenCutHost } from "@/service/opencut/host-channel";
import { buildSeedClips, diffScroSeedClips } from "@/service/scro-video/timeline-seed";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";
import type { OpencutEditMedia } from "@/model/opencut-edit";
import type { PublicTextStyle, PublicVideo } from "@/presentation/serialize";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";
import "./opencut-direct-host.css";

const OpenCutInlineEditor = dynamic(() => import("@/opencut/embed/scro-inline-editor"), {
  ssr: false,
  loading: () => (
    <p className="px-4 py-6 text-sm text-muted">載入 OpenCut…</p>
  ),
});

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

// Video tab: OpenCut runs in this page, not inside an iframe.
export function OpenCutDirectDesk({
  project,
  textStyles,
}: {
  project: PublicVideo;
  textStyles: PublicTextStyle[];
}) {
  const { t } = useI18n();
  const hostRef = useRef<ScroOpenCutHost | null>(null);
  if (!hostRef.current) hostRef.current = createScroOpenCutHost();
  const host = hostRef.current;
  if (typeof window !== "undefined") window.__SCRO_OPENCUT_HOST__ = host;
  const catalogRef = useRef<SubtitleCatalog | null>(null);
  const storyClips = project.phaseA?.clips;
  const savedRef = useRef<SavedEdit | null>(null);
  const fetchedRef = useRef(false);
  const readyRef = useRef(false);
  const startedRef = useRef(false);
  const syncedRef = useRef(false);
  const savingRef = useRef(false);
  const pendingSave = useRef<SaveMessage | null>(null);
  const seedClips = useMemo(() => buildSeedClips(project), [project]);
  const seedClipsRef = useRef(seedClips);
  seedClipsRef.current = seedClips;
  const prevSeedRef = useRef<ScroVideoSeedClip[]>([]);
  const readyVideos = seedClips.filter((clip) => clip.videoUrl);

  const post = (message: unknown) => {
    host.postToEditor(message);
  };

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
    post({ type: "scro-subtitle-catalog", videoId: project.id, catalog });
  }, [project.id, project.subtitleLook, project.textStyleId, storyClips, textStyles, t]);

  useLayoutEffect(() => {
    const channel = host;
    window.__SCRO_OPENCUT_HOST__ = channel;
    let cancel = false;

    const postCatalog = () => {
      const catalog = catalogRef.current;
      if (!catalog) return;
      channel.postToEditor({ type: "scro-subtitle-catalog", videoId: project.id, catalog });
    };

    const beginSync = () => {
      if (startedRef.current || !fetchedRef.current || !readyRef.current) return;
      startedRef.current = true;
      const saved = savedRef.current;
      if (saved) {
        channel.postToEditor({
          type: "scro-restore",
          videoId: project.id,
          aspectRatio: project.aspectRatio,
          project: saved.project,
          media: saved.media,
          updatedAt: saved.updatedAt,
        });
        return;
      }
      const clips = seedClipsRef.current;
      channel.postToEditor({
        type: "scro-seed-videos",
        videoId: project.id,
        aspectRatio: project.aspectRatio,
        clips,
      });
      prevSeedRef.current = clips;
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
        for (const plate of result.plates) urlByClip.set(plate.clipNumber, plate.url);
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

      channel.postToEditor({
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

    const stop = channel.subscribeScro((payload) => {
      const data = payload as {
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
        prevSeedRef.current = seedClipsRef.current;
        // Push current posters/videos onto restored scroClipNumber elements.
        for (const clip of seedClipsRef.current) {
          channel.postToEditor({
            type: "scro-clip-updated",
            videoId: project.id,
            clip,
          });
        }
        return;
      }
      if (data?.type === "scro-project-save") void persist(data as SaveMessage);
    });

    void getOpencutEditAction(project.id).then((result) => {
      if (cancel) return;
      fetchedRef.current = true;
      savedRef.current = result.ok ? result.edit : null;
      beginSync();
    });

    return () => {
      cancel = true;
      stop();
      if (window.__SCRO_OPENCUT_HOST__ === channel) delete window.__SCRO_OPENCUT_HOST__;
    };
  }, [project.aspectRatio, project.id]);

  useEffect(() => {
    if (!syncedRef.current) return;
    const changed = diffScroSeedClips({
      previous: prevSeedRef.current,
      next: seedClips,
    });
    prevSeedRef.current = seedClips;
    host.postToEditor({
      type: "scro-videos-state",
      videoId: project.id,
      clips: seedClips,
    });
    for (const clip of changed) {
      host.postToEditor({
        type: "scro-clip-updated",
        videoId: project.id,
        clip,
      });
    }
  }, [seedClips, project.id, host]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--studio-canvas)]">
      <OpenCutExportButton
        project={project}
        host={host}
        disabled={readyVideos.length === 0}
      />
      {seedClips.length === 0 ? (
        <p className="shrink-0 px-4 py-2 text-xs text-muted">{t("video.opencut.empty")}</p>
      ) : null}
      <div className="min-h-0 flex-1">
        <OpenCutInlineEditor projectId={`scro-${project.id}`} />
      </div>
    </div>
  );
}
