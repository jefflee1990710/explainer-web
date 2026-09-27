import { LANGUAGE_PRESETS } from "@/service/director/languages";
import type { PhaseAProposal, VoLanguage } from "@/model/project";
import type { VideoShareId } from "@/service/video-share/platforms";

// Platform tone the model must follow. Output is paste-ready caption only.
export const CAPTION_GUIDES: Record<VideoShareId, string> = {
  instagram_reel:
    "Write an Instagram Reel caption: 1 punchy hook line, 1-2 supporting lines, then 3-5 relevant hashtags. No title prefix.",
  instagram_post:
    "Write an Instagram Feed post caption: a short opening, 2-4 sentences of value, then 3-8 hashtags. No title prefix.",
  facebook:
    "Write a Facebook post: 1-3 short paragraphs, conversational. At most 2 hashtags. No title prefix.",
  tiktok:
    "Write a TikTok caption: one hook sentence plus 3-6 hashtags. Keep it punchy. No title prefix.",
  youtube:
    "Write a YouTube title on the first line (no prefix), a blank line, then a 2-4 sentence description. Optional 3-5 hashtags at the end.",
  x: "Write a single X/Twitter post. Max 240 characters. 0-2 hashtags. No URL — the share link is added separately. No title prefix.",
};

function clipLine(clip: PhaseAProposal["clips"][number]) {
  const spoken = [clip.startVo, clip.endVo, clip.englishVo].filter(Boolean).join(" / ");
  const scene = [clip.startScene, clip.endScene, clip.explainerScene].filter(Boolean).join(" / ");
  return `Clip ${clip.clipNumber}: ${spoken || "(no VO)"} | ${scene || "(no scene)"}`;
}

// Flatten Phase A + source into the user prompt. Never send the MP4.
export function captionBrief(input: {
  source?: string;
  phaseA?: PhaseAProposal;
}) {
  const title = input.phaseA?.localizedTitle || input.phaseA?.englishTitle || "";
  return [
    title && `Title: ${title}`,
    input.phaseA?.coreMessage && `Core message: ${input.phaseA.coreMessage}`,
    input.phaseA?.hookStrategy && `Hook: ${input.phaseA.hookStrategy}`,
    input.source?.trim() && `Source: ${input.source.trim().slice(0, 800)}`,
    input.phaseA?.clips.length ? input.phaseA.clips.map(clipLine).join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function shareCaptionPrompt(input: {
  platform: VideoShareId;
  language: VoLanguage;
  brief: string;
}) {
  return {
    system: [
      "You draft social captions for a finished explainer video.",
      "Output ONLY the caption text the user will paste. No quotes, no markdown fences, no preamble.",
      "Write in the video's voiceover language.",
      LANGUAGE_PRESETS[input.language].skillHint,
      CAPTION_GUIDES[input.platform],
    ].join("\n"),
    user: input.brief,
  };
}
