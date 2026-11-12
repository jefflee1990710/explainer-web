import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import type { OnscreenTextItem, Project, StoryboardRow } from "@/model/project";
import { displayNumbersForOnScreenText } from "@/service/director/onscreen-number-text";
import { isDiagramExplainerSkill } from "@/service/director/explainer-family";
import {
  enqueueProjectOnScreenText,
  requeueOnScreenTextDraw,
} from "@/service/opencut/on-screen-text";

export type AutoOnScreenTextTarget = {
  clipIndex: number;
  text: string;
  playheadSeconds: number;
  // Offset inside this clip, not the full timeline.
  sectionStart: number;
  sectionLength: number;
};

const SENTENCE_END = /[.!?。！？]["'”’)\]]*$/u;

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeOnScreenText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Split a spoken line on sentence punctuation, keeping decimals and names like Scro.io intact.
export function splitSpokenSentences(line: string): string[] {
  const masked = line
    .replace(/(\d)\.(\d)/g, "$1§$2")
    .replace(/([A-Za-z])\.(?=[A-Za-z])/g, "$1§");
  const parts = masked.match(/[^。！？.!?]+[。！？.!?]+|[^。！？.!?]+$/gu) ?? [];
  return parts.map((part) => part.replace(/§/g, ".").trim()).filter(Boolean);
}

// Join subtitle cues into the full sentences that get painted on the clip.
// A cue with no ending punctuation stays with the next cue until the sentence closes.
export function groupSpokenSubtitleSentences(
  cues: string[] | undefined,
  spoken?: string,
): string[] {
  const cleanCues = (cues ?? []).map((cue) => cue.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (cleanCues.length > 0) {
    const sentences: string[] = [];
    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length === 0) return;
      sentences.push(buffer.join(" "));
      buffer = [];
    };
    for (const cue of cleanCues) {
      const pieces = splitSpokenSentences(cue);
      for (const piece of pieces) {
        buffer.push(piece);
        if (SENTENCE_END.test(piece)) flush();
      }
    }
    flush();
    return sentences;
  }
  const line = (spoken ?? "").replace(/\s+/g, " ").trim();
  if (!line) return [];
  return splitSpokenSentences(line);
}

// Share the clip duration across sentences. Each window stays at least 2.5s when the clip is long enough
// so it matches the H3 text-inpaint length.
export function sentenceTimeWindows(
  texts: string[],
  durationSeconds: number,
): Array<{ text: string; start: number; length: number }> {
  const duration = roundTenth(Math.max(0.5, durationSeconds));
  if (texts.length === 0) return [];
  if (texts.length === 1) return [{ text: texts[0], start: 0, length: duration }];

  const weights = texts.map((text) => Math.max(1, text.length));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let lengths = weights.map((weight) => (duration * weight) / total);
  const minLength = duration >= texts.length * 2.5 ? 2.5 : duration / texts.length;
  const short = lengths.map((length) => length < minLength);
  const shortCount = short.filter(Boolean).length;
  if (shortCount > 0 && shortCount < texts.length) {
    const reserved = shortCount * minLength;
    const longWeight = weights.reduce((sum, weight, index) => sum + (short[index] ? 0 : weight), 0);
    lengths = lengths.map((length, index) => {
      if (short[index]) return minLength;
      return ((duration - reserved) * weights[index]) / longWeight;
    });
  }

  const rounded = lengths.map((length, index) =>
    index === lengths.length - 1 ? length : roundTenth(length),
  );
  const used = rounded.slice(0, -1).reduce((sum, length) => sum + length, 0);
  rounded[rounded.length - 1] = roundTenth(Math.max(0.1, duration - used));

  let cursor = 0;
  return texts.map((text, index) => {
    const start = roundTenth(cursor);
    const length = rounded[index] ?? 0.1;
    cursor = roundTenth(cursor + length);
    return { text, start, length };
  });
}

// Extract clean hook headline from quotes 「...」 or fallback to title/voiceover.
export function extractCleanHookText(input: {
  sceneText?: string;
  fallbackTitle?: string;
  fallbackVo?: string;
}): string {
  const { sceneText, fallbackTitle, fallbackVo } = input;
  if (sceneText) {
    const quoteMatch = sceneText.match(/[「"“]([^」"”]+)[」"”]/);
    if (quoteMatch?.[1]?.trim()) {
      return quoteMatch[1].trim();
    }
  }
  const cleanTitle = (fallbackTitle ?? "")
    .replace(/[「」"“”]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanTitle) {
    return cleanTitle.length > 40 ? `${cleanTitle.slice(0, 38).trim()}…` : cleanTitle;
  }
  const cleanVo = (fallbackVo ?? "")
    .replace(/[「」"“”]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanVo) {
    return cleanVo.length > 40 ? `${cleanVo.slice(0, 38).trim()}…` : cleanVo;
  }
  return "Hook";
}

function clipDurationSeconds(project: Project, clipIndex: number): number {
  const clip = project.clips?.[clipIndex];
  const row = project.phaseA?.clips?.[clipIndex];
  const duration = clip?.durationSeconds ?? row?.durationSeconds ?? 6;
  return duration > 0 ? duration : 6;
}

// `startVo` / `endVo` are the two beats of one spoken line. The full line is `englishVo`.
function spokenLineForRow(row: StoryboardRow | undefined): string {
  const full = row?.englishVo?.replace(/\s+/g, " ").trim();
  if (full) return full;
  const start = row?.startVo?.replace(/\s+/g, " ").trim() ?? "";
  const end = row?.endVo?.replace(/\s+/g, " ").trim() ?? "";
  if (start && end && !start.includes(end)) return `${start} ${end}`.trim();
  return start || end;
}

function spokenSentencesForRow(
  project: Project,
  row: StoryboardRow | undefined,
  clipIndex: number,
): string[] {
  const spoken = groupSpokenSubtitleSentences(row?.subtitleCues, spokenLineForRow(row));
  if (spoken.length > 0) return spoken.map(displayNumbersForOnScreenText);
  return [
    displayNumbersForOnScreenText(
      extractCleanHookText({
        sceneText: row?.startScene || row?.explainerScene,
        fallbackTitle: clipIndex === 0 ? project.phaseA?.localizedTitle : undefined,
      }),
    ),
  ];
}

function appendClipSentenceTargets(
  project: Project,
  targets: AutoOnScreenTextTarget[],
  clipIndex: number,
  timelineSeconds: number,
) {
  const row = project.phaseA?.clips?.[clipIndex];
  const windows = sentenceTimeWindows(
    spokenSentencesForRow(project, row, clipIndex),
    clipDurationSeconds(project, clipIndex),
  );
  for (const window of windows) {
    targets.push({
      clipIndex,
      text: window.text,
      playheadSeconds: roundTenth(timelineSeconds + window.start),
      sectionStart: window.start,
      sectionLength: window.length,
    });
  }
}

// Resolve the spoken sentences that get painted into each Explainer clip.
// Diagram explainers always paint every clip. Other explainer slugs still honor hook vs all.
export function resolveExplainerAutoOnScreenTextTargets(
  project: Project,
): AutoOnScreenTextTarget[] {
  if (project.skillSlug !== "explainer" && !project.skillSlug?.includes("explainer")) {
    return [];
  }
  if (!project.onScreenTextStyleId) {
    return [];
  }

  const coverage = isDiagramExplainerSkill(project.skillSlug)
    ? "all"
    : project.onScreenTextCoverage || "hook";
  const storyboard = project.phaseA?.clips ?? [];
  const clips = project.clips || [];
  const targets: AutoOnScreenTextTarget[] = [];

  if (coverage === "hook") {
    appendClipSentenceTargets(project, targets, 0, 0);
    return targets;
  }

  const count = Math.max(storyboard.length, clips.length, 1);
  let timelineSeconds = 0;
  for (let index = 0; index < count; index++) {
    appendClipSentenceTargets(project, targets, index, timelineSeconds);
    timelineSeconds += clipDurationSeconds(project, index);
  }
  return targets;
}

// The clip video must already exist. Lettering is drawn into that file, not onto the still.
export function explainerClipHasVideo(
  clips: Project["clips"] | undefined,
  clipIndex: number,
): boolean {
  const clip = clips?.[clipIndex];
  if (!clip || clip.status !== "completed") return false;
  const url = (clip.blobUrl || clip.outputUrl || "").trim();
  return url.startsWith("https://");
}

function clipVideoUrl(clips: Project["clips"] | undefined, clipIndex: number): string {
  const clip = clips?.[clipIndex];
  return (clip?.blobUrl || clip?.outputUrl || "").trim();
}

// A fresh regenerate has a new clip URL. An older paint that still IS the clip file, and has no
// base recorded, stays as-is until the clip is generated again.
export function resolveOnScreenDrawBase(
  clipUrl: string,
  items: OnscreenTextItem[] | undefined,
  clipIndex: number,
): { baseVideoUrl: string; legacy: boolean } {
  const url = clipUrl.trim();
  const painted = (items ?? []).find(
    (item) => (item.clipIndex ?? 0) === clipIndex && item.inpaintedVideoUrl === url,
  );
  if (!painted) return { baseVideoUrl: url, legacy: false };
  if (painted.baseVideoUrl) return { baseVideoUrl: painted.baseVideoUrl, legacy: false };
  return { baseVideoUrl: url, legacy: true };
}

export function onscreenSentenceIsDrawn(
  items: OnscreenTextItem[] | undefined,
  clipIndex: number,
  text: string,
  baseVideoUrl: string,
): boolean {
  const wanted = normalizeOnScreenText(text);
  return (items ?? []).some((item) => {
    if ((item.clipIndex ?? 0) !== clipIndex) return false;
    if (item.baseVideoUrl !== baseVideoUrl) return false;
    if (normalizeOnScreenText(item.text) !== wanted) return false;
    if (item.status === "queued" || item.status === "in_progress") return true;
    return item.status === "completed" && Boolean(item.inpaintedVideoUrl);
  });
}

function onscreenDrawInFlight(
  items: OnscreenTextItem[] | undefined,
  clipIndex: number,
  baseVideoUrl: string,
): boolean {
  return (items ?? []).some(
    (item) =>
      (item.clipIndex ?? 0) === clipIndex &&
      item.baseVideoUrl === baseVideoUrl &&
      (item.status === "queued" || item.status === "in_progress"),
  );
}

// One sentence per clip. The next sentence waits until the current draw has replaced the file.
export function nextUndrawnOnScreenTargets(input: {
  targets: AutoOnScreenTextTarget[];
  clips: Project["clips"] | undefined;
  items: OnscreenTextItem[] | undefined;
}): AutoOnScreenTextTarget[] {
  const seen = new Set<number>();
  const next: AutoOnScreenTextTarget[] = [];
  for (const target of input.targets) {
    if (seen.has(target.clipIndex)) continue;
    if (!explainerClipHasVideo(input.clips, target.clipIndex)) {
      seen.add(target.clipIndex);
      continue;
    }
    const clipUrl = clipVideoUrl(input.clips, target.clipIndex);
    const base = resolveOnScreenDrawBase(clipUrl, input.items, target.clipIndex);
    seen.add(target.clipIndex);
    if (base.legacy) continue;
    if (onscreenDrawInFlight(input.items, target.clipIndex, base.baseVideoUrl)) continue;
    const pending = input.targets.find(
      (candidate) =>
        candidate.clipIndex === target.clipIndex &&
        !onscreenSentenceIsDrawn(input.items, candidate.clipIndex, candidate.text, base.baseVideoUrl),
    );
    if (pending) next.push(pending);
  }
  return next;
}

function reusableOnScreenText(
  items: OnscreenTextItem[] | undefined,
  target: AutoOnScreenTextTarget,
  baseVideoUrl: string,
): OnscreenTextItem | undefined {
  const wanted = normalizeOnScreenText(target.text);
  return (items ?? []).find(
    (item) =>
      (item.clipIndex ?? 0) === target.clipIndex &&
      normalizeOnScreenText(item.text) === wanted &&
      !item.inpaintedVideoUrl &&
      (item.baseVideoUrl === baseVideoUrl || !item.baseVideoUrl) &&
      (item.status === "completed" || item.status === "failed"),
  );
}

// Background orchestrator that enqueues on-screen text jobs for Explainer videos.
// Runs after the target clip video is completed, then draws each spoken sentence into that video.
export async function triggerExplainerAutoOnScreenText(
  projectId: string | ObjectId,
): Promise<{ ok: boolean; enqueuedCount: number; error?: string }> {
  try {
    const id = typeof projectId === "string" ? new ObjectId(projectId) : projectId;
    const projects = await videosCollection();
    const project = await projects.findOne({ _id: id });
    if (!project) {
      return { ok: false, enqueuedCount: 0, error: "專案不存在" };
    }
    // Whiteboard and paper-cutout draw the explanation on the start still.
    // MiniMax H3 then adds motion. Do not post-paint with ref2va / object-add.
    if (isDiagramExplainerSkill(project.skillSlug)) {
      return { ok: true, enqueuedCount: 0 };
    }

    const targets = resolveExplainerAutoOnScreenTextTargets(project);
    if (targets.length === 0) {
      return { ok: true, enqueuedCount: 0 };
    }

    const pending = nextUndrawnOnScreenTargets({
      targets,
      clips: project.clips,
      items: project.onscreenTexts,
    });
    let enqueuedCount = 0;
    for (const target of pending) {
      const clipUrl = clipVideoUrl(project.clips, target.clipIndex);
      const base = resolveOnScreenDrawBase(clipUrl, project.onscreenTexts, target.clipIndex);
      const reusable = reusableOnScreenText(project.onscreenTexts, target, base.baseVideoUrl);
      if (reusable) {
        const requeued = await requeueOnScreenTextDraw(project, reusable, {
          sectionStart: target.sectionStart,
          sectionLength: target.sectionLength,
          baseVideoUrl: base.baseVideoUrl,
        });
        if (requeued) enqueuedCount++;
        continue;
      }

      const res = await enqueueProjectOnScreenText({
        project,
        textStyleId: project.onScreenTextStyleId!,
        text: target.text,
        clipIndex: target.clipIndex,
        playheadSeconds: target.playheadSeconds,
        sectionStart: target.sectionStart,
        sectionLength: target.sectionLength,
        baseVideoUrl: base.baseVideoUrl,
      });
      if (res.ok) enqueuedCount++;
    }

    return { ok: true, enqueuedCount };
  } catch (error) {
    return {
      ok: false,
      enqueuedCount: 0,
      error: error instanceof Error ? error.message : "自動產生畫面文字失敗",
    };
  }
}
