import { previewUrlsFromVideo } from "@/presentation/serialize";

type PreviewFrame = {
  clipNumber: number;
  position: string;
  status: string;
  blobUrl?: string;
  outputUrl?: string;
  error?: string;
};

type PreviewClip = {
  clipNumber: number;
  status: string;
  durationSeconds: number;
  blobUrl?: string;
  outputUrl?: string;
  error?: string;
};

// Fields the editor preview reads: stills, clip files, reel, cover, and final export.
export type PreviewSource = {
  id: string;
  status: string;
  aspectRatio: string;
  error?: string;
  phaseA?: { localizedTitle?: string; englishTitle?: string };
  characterStillUrl?: string;
  characterImageUrl?: string;
  frames: PreviewFrame[];
  clips: PreviewClip[];
  reelUrl?: string;
  reelStatus?: string;
  reelError?: string;
  coverUrl?: string;
  coverStatus?: string;
  coverPrompt?: string;
  coverSafeAreas?: string[];
  finalUrl?: string;
  finalStatus?: string;
  finalError?: string;
};

function mediaUrl(item: { blobUrl?: string; outputUrl?: string }) {
  return item.blobUrl || item.outputUrl || null;
}

// Compact playback map for an agent. get_video still returns the full storyboard.
export function videoPreview(project: PreviewSource) {
  return {
    id: project.id,
    status: project.status,
    aspectRatio: project.aspectRatio,
    title: project.phaseA?.localizedTitle || project.phaseA?.englishTitle || null,
    error: project.error || null,
    stillUrl: project.characterStillUrl || project.characterImageUrl || null,
    previewUrls: previewUrlsFromVideo(project, 24),
    frames: project.frames.map((frame) => ({
      clipNumber: frame.clipNumber,
      position: frame.position,
      status: frame.status,
      url: mediaUrl(frame),
      error: frame.error || null,
    })),
    clips: project.clips.map((clip) => ({
      clipNumber: clip.clipNumber,
      status: clip.status,
      durationSeconds: clip.durationSeconds,
      url: mediaUrl(clip),
      error: clip.error || null,
    })),
    reel: {
      status: project.reelStatus || null,
      url: project.reelUrl || null,
      error: project.reelError || null,
    },
    cover: {
      status: project.coverStatus || null,
      url: project.coverUrl || null,
      prompt: project.coverPrompt || null,
      safeAreas: project.coverSafeAreas || [],
    },
    final: {
      status: project.finalStatus || null,
      url: project.finalUrl || null,
      error: project.finalError || null,
    },
  };
}
