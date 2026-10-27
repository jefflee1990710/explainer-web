"use client";

import { useEffect, useRef } from "react";
import { runSmoothSilenceGapsOnTimeline } from "@/opencut/embed/scro-smooth-silence";
import { syncAutoSmoothSilence } from "@/opencut/embed/scro-smooth-silence-pack";
import { useScroVideos } from "@/opencut/embed/scro-video-store";
import {
  isTalkingBrollSkill,
  skillUsesOnScreenLipSync,
} from "@/service/director/skill-rules";
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import type { PublicVideo } from "@/presentation/serialize";

// Applies Smooth Silence on the timeline for clips the server has not already
// trimmed. Lip-sync videos generated after the server trim land with almost no
// dead air, so this pass leaves them at full length. There is no toolbar switch.
export function SmoothSilenceAuto({ project }: { project?: PublicVideo }) {
  const videos = useScroVideos();
  const autoAppliedSigRef = useRef<string>("");

  const videoId = project?.id ?? videos?.videoId ?? null;
  const isTalkingHead = Boolean(
    project?.skillSlug &&
      (isTalkingHeadSkill(project.skillSlug) ||
        isTalkingBrollSkill(project.skillSlug) ||
        skillUsesOnScreenLipSync(project.skillSlug)),
  );
  const storeVideoUrls = (videos?.clips ?? [])
    .filter((clip) => Boolean(clip.videoUrl && !clip.staleVideo))
    .map((clip) => `${clip.clipNumber}:${clip.videoUrl}`);
  const projectVideoUrls = (project?.clips ?? [])
    .filter((clip) => clip.status === "completed" && Boolean(clip.blobUrl || clip.outputUrl))
    .map((clip) => `${clip.clipNumber}:${clip.blobUrl || clip.outputUrl}`);
  const hasGeneratedVideo = storeVideoUrls.length > 0 || projectVideoUrls.length > 0;
  const videoSignature = `${videoId ?? ""}|${storeVideoUrls.join(",") || projectVideoUrls.join(",")}`;

  useEffect(() => {
    syncAutoSmoothSilence({
      videoId,
      isTalkingHead,
      hasGeneratedVideo,
    });
  }, [videoId, isTalkingHead, hasGeneratedVideo]);

  useEffect(() => {
    if (!isTalkingHead || !hasGeneratedVideo || storeVideoUrls.length === 0) return;
    if (autoAppliedSigRef.current === videoSignature) return;
    autoAppliedSigRef.current = videoSignature;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const { EditorCore } = await import("@/opencut/core");
        const editor = EditorCore.getInstance();
        await runSmoothSilenceGapsOnTimeline({
          editor,
          pushHistory: false,
        });
      } catch {
        // Ignore background auto-trim errors so editor loading stays uninterrupted.
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hasGeneratedVideo, isTalkingHead, storeVideoUrls.length, videoSignature]);

  return null;
}
