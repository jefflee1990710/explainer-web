"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { OpenCutExportButton } from "@/presentation/components/app/projects/new/opencut-export-button";
import {
  OpenCutLoadProgressBar,
  type OpenCutLoadProgress,
} from "@/presentation/components/app/projects/new/opencut-load-progress-bar";
import {
  persistOpencutProjectSave,
  pollOpencutSubtitlePlates,
} from "@/presentation/components/app/projects/new/opencut-desk-actions";
import {
  OpenCutScroAiShell,
  useOpenCutScroAiState,
} from "@/presentation/components/app/projects/new/opencut-scro-ai-shell";
import { OpenCutScroToolbar } from "@/presentation/components/app/projects/new/opencut-scro-toolbar";
import type { BulkMode } from "@/presentation/components/project/bulk-generate-dialog";
import { getOpencutEditAction } from "@/presentation/actions/opencut-edit";
import { generateSelectedClipsAction } from "@/presentation/actions/clip-production";
import { sendClipSceneChatAction } from "@/presentation/actions/scene-chat";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import { buildSubtitleCatalog, type SubtitleCatalog } from "@/service/video-edit/subtitle-catalog";
import {
  beginAutosave,
  finishAutosave,
  type AutosaveQueue,
} from "@/service/opencut/autosave";
import { createScroOpenCutHost } from "@/service/opencut/host-channel";
import {
  isEditorToHostMessage,
  type ScroProjectSaveMessage,
  type ScroVideoSeedClip,
} from "@/service/opencut/messages";
import { allFramesReady, planRemaining } from "@/service/production-plan";
import {
  buildSeedClips,
  diffScroSeedClips,
  storyboardLayoutAction,
} from "@/service/scro-video/timeline-seed";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";
import type { OpencutEditMedia } from "@/model/opencut-edit";
import type { FramePosition, FrameRevisionInput } from "@/model/project";
import type { PublicTextStyle, PublicVideo } from "@/presentation/serialize";
import { EditorLoadingOverlay } from "@/presentation/components/app/projects/new/editor-loading-overlay";
import { OpenCutEditorLoading } from "@/presentation/components/app/projects/new/opencut-editor-loading";
import {
  OpenCutFeatureDiscovery,
  hasSeenOpenCutTutorial,
} from "@/presentation/components/app/projects/new/opencut-feature-discovery";
import "./opencut-direct-host.css";

const OpenCutInlineEditor = dynamic(() => import("@/opencut/embed/scro-inline-editor"), {
  ssr: false,
  loading: OpenCutEditorLoading,
});

type SavedEdit = {
  project: Record<string, unknown>;
  media: OpencutEditMedia[];
  updatedAt: string;
};

export type OpenCutProductionHandlers = {
  credits: number;
  pending: string;
  subscribed: boolean;
  onGenerateFrames: (clipNumber: number) => void;
  onGenerateVideo: (clipNumber: number) => void;
  onCancelVideo: (clipNumber: number) => void;
  onRegenerateFrame: (
    clipNumber: number,
    position: FramePosition,
    revision?: FrameRevisionInput,
  ) => void;
  onBulkGenerate: (mode: BulkMode) => Promise<boolean>;
  onGenerateSelected: (clipNumbers: number[], kind: "frames" | "videos") => Promise<boolean>;
  onProject: (project: PublicVideo) => void;
};

// Video tab: OpenCut runs in this page, not inside an iframe.
export function OpenCutDirectDesk({
  project,
  textStyles,
  production,
}: {
  project: PublicVideo;
  textStyles: PublicTextStyle[];
  production?: OpenCutProductionHandlers;
}) {
  const { t } = useI18n();
  const [host] = useState(createScroOpenCutHost);
  const catalogRef = useRef<SubtitleCatalog | null>(null);
  const storyClips = project.phaseA?.clips;
  const savedRef = useRef<SavedEdit | null>(null);
  const fetchedRef = useRef(false);
  const readyRef = useRef(false);
  const startedRef = useRef(false);
  const syncedRef = useRef(false);
  const saveQueue = useRef<AutosaveQueue<ScroProjectSaveMessage>>({
    busy: false,
    pending: null,
  });
  const seedClips = useMemo(() => buildSeedClips(project), [project]);
  const seedClipsRef = useRef(seedClips);
  const prevSeedRef = useRef<ScroVideoSeedClip[]>([]);
  const didAutoPlanRef = useRef(false);
  const readyVideos = seedClips.filter((clip) => clip.videoUrl);
  const projectRef = useRef(project);
  const productionRef = useRef(production);
  const ai = useOpenCutScroAiState();
  const aiRef = useRef(ai);
  const [saving, setSaving] = useState(false);
  const [booting, setBooting] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [loadProgress, setLoadProgress] = useState<OpenCutLoadProgress | null>(null);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [selectedClipNumber, setSelectedClipNumber] = useState<number | null>(null);
  const [checkedClipNumbers, setCheckedClipNumbers] = useState<number[]>([]);

  // Keep latest values accessible to channel listeners without mutating refs during render.
  useLayoutEffect(() => {
    seedClipsRef.current = seedClips;
    projectRef.current = project;
    productionRef.current = production;
    aiRef.current = ai;
  }, [seedClips, project, production, ai]);

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
    host.postToEditor({ type: "scro-subtitle-catalog", videoId: project.id, catalog });
  }, [host, project.id, project.subtitleLook, project.textStyleId, storyClips, textStyles, t]);

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
      const clips = seedClipsRef.current;
      const saved = savedRef.current;
      if (saved) {
        // Populate the ScroVideo store immediately so the Assets panel can show
        // storyboard clip cards while the saved project and still blobs restore.
        channel.postToEditor({
          type: "scro-videos-state",
          videoId: project.id,
          clips,
        });
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
      channel.postToEditor({
        type: "scro-seed-videos",
        videoId: project.id,
        aspectRatio: project.aspectRatio,
        clips,
        // No saved cut (a recreate deleted it). Replace the local timeline
        // so the previous videos do not stay under the new storyboard.
        replace: true,
        autoSubtitles: isTalkingHeadSkill(projectRef.current.skillSlug),
      });
      prevSeedRef.current = clips;
      syncedRef.current = true;
    };

    const persist = async (data: ScroProjectSaveMessage) => {
      if (data.videoId !== project.id) return;
      const began = beginAutosave(saveQueue.current, data);
      saveQueue.current = began.queue;
      if (!began.run) return;
      setSaving(true);
      let current: ScroProjectSaveMessage | null = began.run;
      try {
        while (current) {
          await persistOpencutProjectSave(project.id, current);
          const finished = finishAutosave(saveQueue.current);
          saveQueue.current = finished.queue;
          current = finished.run;
        }
      } catch (error) {
        console.warn("[opencut] autosave failed:", error);
        saveQueue.current = { busy: false, pending: null };
      } finally {
        setSaving(saveQueue.current.busy);
      }
    };

    const stop = channel.subscribeScro((payload) => {
      if (!isEditorToHostMessage(payload)) return;

      switch (payload.type) {
        case "scro-editor-ready": {
          readyRef.current = true;
          // Show the editor immediately once mounted; clips load one by one with live progress.
          setBooting(false);
          setEditorEpoch((epoch) => epoch + 1);
          beginSync();
          postCatalog();
          channel.postToEditor({
            type: "scro-clip-menu-state",
            videoId: project.id,
            idle: (productionRef.current?.pending ?? "") === "",
            videosEnabled: allFramesReady(projectRef.current),
          });
          return;
        }
        case "scro-subtitle-request": {
          postCatalog();
          return;
        }
        case "scro-subtitle-generate": {
          const clipNumbers = Array.isArray(payload.clipNumbers)
            ? payload.clipNumbers.filter(
                (n): n is number => typeof n === "number" && Number.isInteger(n),
              )
            : [];
          if (
            typeof payload.videoId === "string" &&
            typeof payload.textStyleId === "string" &&
            clipNumbers.length > 0
          ) {
            void pollOpencutSubtitlePlates(project.id, {
              videoId: payload.videoId,
              textStyleId: payload.textStyleId,
              clipNumbers,
            }).then((result) => {
              if (result) channel.postToEditor(result);
            });
          }
          return;
        }
        case "scro-clip-action": {
          if (payload.videoId !== project.id || typeof payload.clipNumber !== "number") return;
          const handlers = productionRef.current;
          if (!handlers) return;
          if (payload.action === "generate-frames") handlers.onGenerateFrames(payload.clipNumber);
          else if (payload.action === "generate-video") handlers.onGenerateVideo(payload.clipNumber);
          else if (payload.action === "cancel-video") void handlers.onCancelVideo(payload.clipNumber);
          return;
        }
        case "scro-scene-edit": {
          if (
            payload.videoId !== project.id ||
            typeof payload.clipNumber !== "number" ||
            typeof payload.requestId !== "string"
          ) {
            return;
          }
          const { clipNumber, requestId, message = "" } = payload;
          void sendClipSceneChatAction({
            videoId: project.id,
            clipNumber,
            message,
          }).then((result) => {
            if (result.ok) productionRef.current?.onProject(result.project);
            channel.postToEditor({
              type: "scro-scene-edit-result",
              videoId: project.id,
              clipNumber,
              requestId,
              ok: result.ok,
              error: result.ok ? undefined : result.error,
            });
          });
          return;
        }
        case "scro-open-ai": {
          if (payload.videoId !== project.id || typeof payload.clipNumber !== "number") return;
          if (payload.kind === "scene-chat") {
            aiRef.current.setSceneChatClip(payload.clipNumber);
            return;
          }
          if (
            payload.kind === "frame-edit" &&
            (payload.position === "start" || payload.position === "end")
          ) {
            aiRef.current.setEditingFrame({
              clipNumber: payload.clipNumber,
              position: payload.position,
            });
          }
          return;
        }
        case "scro-selection-state": {
          if (payload.videoId !== project.id) return;
          setSelectedClipNumber(
            typeof payload.selectedClipNumber === "number" ? payload.selectedClipNumber : null,
          );
          setCheckedClipNumbers(
            Array.isArray(payload.checkedClipNumbers)
              ? payload.checkedClipNumbers.filter(
                  (n): n is number => typeof n === "number" && Number.isInteger(n),
                )
              : [],
          );
          return;
        }
        case "scro-load-progress": {
          if (payload.videoId !== project.id) return;
          if (payload.done || !payload.total) {
            setLoadProgress(null);
          } else {
            setLoadProgress({
              current: Math.min(payload.current ?? 1, payload.total),
              total: payload.total,
              label: payload.label,
            });
          }
          return;
        }
        case "scro-seed-done": {
          if (payload.videoId !== project.id) return;
          setBooting(false);
          return;
        }
        case "scro-restore-done": {
          setBooting(false);
          syncedRef.current = true;
          prevSeedRef.current = seedClipsRef.current;
          // Reconcile restored timeline against the latest storyboard/video URLs.
          channel.postToEditor({
            type: "scro-videos-state",
            videoId: project.id,
            clips: seedClipsRef.current,
          });
          return;
        }
        case "scro-project-save": {
          void persist(payload);
          return;
        }
      }
    });

    void getOpencutEditAction(project.id)
      .then((result) => {
        if (cancel) return;
        fetchedRef.current = true;
        savedRef.current = result.ok ? result.edit : null;
        beginSync();
      })
      .catch(() => {
        if (cancel) return;
        fetchedRef.current = true;
        savedRef.current = null;
        beginSync();
      });

    return () => {
      cancel = true;
      stop();
      if (window.__SCRO_OPENCUT_HOST__ === channel) delete window.__SCRO_OPENCUT_HOST__;
    };
  }, [host, project.aspectRatio, project.id]);

  useEffect(() => {
    if (!readyRef.current || !syncedRef.current) return;
    const previous = prevSeedRef.current;
    const layout = storyboardLayoutAction({
      synced: true,
      previousCount: previous.length,
      nextCount: seedClips.length,
    });
    prevSeedRef.current = seedClips;
    // A new storyboard (first create, or recreate after the old one was cleared)
    // replaces the main track and places each clip at its storyboard time.
    if (layout === "clear" || layout === "place") {
      host.postToEditor({
        type: "scro-seed-videos",
        videoId: project.id,
        aspectRatio: project.aspectRatio,
        clips: seedClips,
        replace: true,
        autoSubtitles: isTalkingHeadSkill(project.skillSlug),
      });
      return;
    }
    const changed = diffScroSeedClips({
      previous,
      next: seedClips,
    });
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
  }, [seedClips, project.id, project.aspectRatio, project.skillSlug, host, editorEpoch]);

  // Automatically open the OpenCut Feature Discovery tutorial once the editor finishes booting (unless user checked "Don't show again").
  useEffect(() => {
    if (booting) return;
    if (!hasSeenOpenCutTutorial()) {
      const timer = window.setTimeout(() => setTutorialOpen(true), 450);
      return () => window.clearTimeout(timer);
    }
  }, [booting]);

  // Assets ⋮ menu reads this so Finish / All frames / All videos stay in sync.
  useEffect(() => {
    if (!production) return;
    host.postToEditor({
      type: "scro-clip-menu-state",
      videoId: project.id,
      idle: production.pending === "",
      videosEnabled: allFramesReady(project),
    });
  }, [host, production, project]);

  // Once per desk session: queue missing start stills only. Videos wait for a click.
  useEffect(() => {
    if (!project.phaseA?.clips?.length) {
      didAutoPlanRef.current = false;
      return;
    }
    if (didAutoPlanRef.current) return;
    const frames = planRemaining(project).frames;
    if (frames.length === 0) {
      didAutoPlanRef.current = true;
      return;
    }
    didAutoPlanRef.current = true;
    void generateSelectedClipsAction(project.id, frames, "frames").then((result) => {
      if (!result.ok) {
        if (/請稍候再試/.test(result.error)) {
          didAutoPlanRef.current = false;
        }
        console.warn("[scro-video] auto plan:", result.error);
      } else {
        productionRef.current?.onProject(result.project);
      }
      notifyTasksChanged();
    });
  }, [project]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--studio-canvas)]">
      <OpenCutExportButton
        project={project}
        host={host}
        disabled={readyVideos.length === 0}
        idle={(production?.pending ?? "") === ""}
        saving={saving}
        onOpenTutorial={() => setTutorialOpen(true)}
      />
      {production ? (
        <OpenCutScroToolbar
          project={project}
          credits={production.credits}
          pending={production.pending}
          checkedClipNumbers={checkedClipNumbers}
          selectedClipNumber={selectedClipNumber}
          onBulkGenerate={production.onBulkGenerate}
          onGenerateSelected={production.onGenerateSelected}
          onClearChecked={() => {
            setCheckedClipNumbers([]);
            host.postToEditor({ type: "scro-clear-checked", videoId: project.id });
          }}
          onProject={production.onProject}
        />
      ) : null}
      <OpenCutLoadProgressBar progress={loadProgress} />
      {seedClips.length === 0 ? (
        <p className="shrink-0 px-4 py-2 text-xs text-muted">{t("video.opencut.empty")}</p>
      ) : null}
      <div className="min-h-0 flex-1">
        <OpenCutInlineEditor projectId={`scro-${project.id}`} />
      </div>
      {booting ? <EditorLoadingOverlay placement="absolute" /> : null}
      {production ? (
        <OpenCutScroAiShell
          project={project}
          credits={production.credits}
          pending={production.pending}
          subscribed={production.subscribed}
          sceneChatClip={ai.sceneChatClip}
          editingFrame={ai.editingFrame}
          onCloseSceneChat={() => ai.setSceneChatClip(null)}
          onCloseFrameEdit={() => ai.setEditingFrame(null)}
          onProject={production.onProject}
          onRegenerateFrame={production.onRegenerateFrame}
        />
      ) : null}
      <OpenCutFeatureDiscovery
        open={tutorialOpen && !booting}
        onClose={() => setTutorialOpen(false)}
      />
    </div>
  );
}
