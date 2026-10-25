import type { LessonMediaUrls } from "@/service/academy/catalog/assemble";
import type { AcademyLessonDraft } from "@/service/academy/catalog/lessons";
import { academyVideoPrompt } from "@/service/academy/catalog/prompts";

// OpenRouter clips cap at 15s. Four beats stitch into a one-minute lesson video.
export const ACADEMY_VIDEO_BEAT_SECONDS = 15;
export const ACADEMY_VIDEO_BEAT_COUNT = 4;
export const ACADEMY_VIDEO_SECONDS = ACADEMY_VIDEO_BEAT_SECONDS * ACADEMY_VIDEO_BEAT_COUNT;
export const ACADEMY_LESSON_VIDEO_VERSION = 2;

const WORDS_PER_BEAT = 40;

const BEAT_MOTION = [
  "Open on the first diagram.",
  "Hold the first diagram and underline the idea.",
  "Cut to the second diagram and walk the steps.",
  "Settle on the second diagram and end on the practice.",
] as const;

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function clipWords(text: string, max: number) {
  const words = text.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (words.length <= max) return words.join(" ");
  return `${words.slice(0, max).join(" ")}.`;
}

function firstParagraph(idea: string) {
  return (idea.trim().split(/\n\n+/)[0] || "").replace(/\s+/g, " ").trim();
}

// Four spoken beats that cover the lesson: hook, idea, steps, practice.
export function academyLessonVoiceoverBeats(
  lesson: Pick<AcademyLessonDraft, "excerpt" | "idea" | "steps" | "practice">,
) {
  const steps = lesson.steps.map((step, index) => `${index + 1}. ${step}`).join(" ");
  return [
    clipWords(lesson.excerpt, WORDS_PER_BEAT),
    clipWords(firstParagraph(lesson.idea), WORDS_PER_BEAT),
    clipWords(steps, WORDS_PER_BEAT),
    clipWords(lesson.practice, WORDS_PER_BEAT),
  ];
}

export function academyLessonVoiceover(
  lesson: Pick<AcademyLessonDraft, "excerpt" | "idea" | "steps" | "practice">,
) {
  return academyLessonVoiceoverBeats(lesson).join(" ");
}

export function academyLessonVoiceoverWordCount(
  lesson: Pick<AcademyLessonDraft, "excerpt" | "idea" | "steps" | "practice">,
) {
  return wordCount(academyLessonVoiceover(lesson));
}

export function academyLessonMotion(videoPrompt: string) {
  const match = videoPrompt.match(/Motion:\s*(.+)$/s);
  return (match?.[1] || videoPrompt).trim();
}

export function academyLessonBeatFrame(beatIndex: number): "image1" | "image2" {
  return beatIndex < 2 ? "image1" : "image2";
}

export function academyLessonBeatMotion(videoPrompt: string, beatIndex: number) {
  const motion = academyLessonMotion(videoPrompt);
  const extra = BEAT_MOTION[beatIndex] ?? BEAT_MOTION[0];
  return `${extra} ${motion}`;
}

export type AcademyLessonVideoBeat = {
  beatIndex: number;
  beatCount: number;
  durationSeconds: number;
  frame: "image1" | "image2";
  spoken: string;
  motion: string;
  prompt: string;
};

export function academyLessonVideoBeats(lesson: AcademyLessonDraft): AcademyLessonVideoBeat[] {
  return academyLessonVoiceoverBeats(lesson).map((spoken, beatIndex) => {
    const motion = academyLessonBeatMotion(lesson.videoPrompt, beatIndex);
    return {
      beatIndex,
      beatCount: ACADEMY_VIDEO_BEAT_COUNT,
      durationSeconds: ACADEMY_VIDEO_BEAT_SECONDS,
      frame: academyLessonBeatFrame(beatIndex),
      spoken,
      motion,
      prompt: academyVideoPrompt({
        motion,
        spoken,
        beatIndex,
        beatCount: ACADEMY_VIDEO_BEAT_COUNT,
      }),
    };
  });
}

// Stale 5-second bumper clips (version 1 or missing) must be regenerated.
export function academyLessonNeedsVideo(media: LessonMediaUrls | undefined, force = false) {
  if (force) return true;
  if (!media?.video) return true;
  return media.videoVersion !== ACADEMY_LESSON_VIDEO_VERSION;
}
