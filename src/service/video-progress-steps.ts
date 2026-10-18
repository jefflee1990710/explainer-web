import {
  inFlightCounts,
  productionCounts,
  type ClipStageSource,
  type GenerationDetailTag,
} from "@/service/clip-stage";
import { normalizeProjectStatus } from "@/service/project-status";
import type { ProjectStatus } from "@/model/project";

export const TOTAL_VIDEO_PIPELINE_STEPS = 5 as const;

export type VideoPipelineStepNumber = 1 | 2 | 3 | 4 | 5;

export type VideoPipelineStageId =
  | "storyboard"
  | "locks"
  | "frames"
  | "videos"
  | "ready";

export type VideoPipelineStepState = "done" | "current" | "todo" | "failed";

export type VideoPipelineStepItem = {
  number: VideoPipelineStepNumber;
  fraction: `${VideoPipelineStepNumber}/5`;
  id: VideoPipelineStageId;
  state: VideoPipelineStepState;
};

export type VideoLocksSummary = {
  propsTotal: number;
  propsDone: number;
  propNames: string[];
  platesTotal: number;
  platesDone: number;
  plateNames: string[];
  locksBusy: boolean;
  locksFailed: boolean;
};

export type VideoPipelineProgress = {
  step: VideoPipelineStepNumber;
  totalSteps: typeof TOTAL_VIDEO_PIPELINE_STEPS;
  stepFraction: `${VideoPipelineStepNumber}/5`;
  stageId: VideoPipelineStageId;
  busy: boolean;
  failed: boolean;
  percent: number;
  steps: VideoPipelineStepItem[];
  locks: VideoLocksSummary;
  framesDone: number;
  framesTotal: number;
  framesQueued: number;
  framesGenerating: number;
  videosDone: number;
  videosTotal: number;
  videosQueued: number;
  videosGenerating: number;
};

const STAGE_ORDER: Array<{ number: VideoPipelineStepNumber; id: VideoPipelineStageId }> = [
  { number: 1, id: "storyboard" },
  { number: 2, id: "locks" },
  { number: 3, id: "frames" },
  { number: 4, id: "videos" },
  { number: 5, id: "ready" },
];

// Summarize prop sheet & 3x3 background plate lock generation state.
export function summarizeVideoLocks(project: {
  objectSheetItems?: Array<{ name: string; notes?: string }>;
  objectSheetUrl?: string;
  objectSheetError?: string;
  backgroundPlates?: Array<{
    setId: string;
    name?: string;
    clipNumbers: number[];
    url?: string;
  }>;
  backgroundPlateError?: string;
}): VideoLocksSummary {
  const items = project.objectSheetItems || [];
  const propsTotal = items.length > 0 ? 1 : 0;
  const propsDone = propsTotal > 0 && Boolean(project.objectSheetUrl) ? 1 : 0;
  const propNames = items.map((item) => item.name.trim()).filter(Boolean);

  const activePlates = (project.backgroundPlates || []).filter(
    (plate) => plate.clipNumbers.length > 0,
  );
  const platesTotal = activePlates.length;
  const platesDone = activePlates.filter((plate) => Boolean(plate.url)).length;
  const plateNames = activePlates
    .map((plate) => (plate.name || plate.setId || "").trim())
    .filter(Boolean);

  const objectSheetBusy =
    propsTotal > 0 && !project.objectSheetUrl && !project.objectSheetError;
  const backgroundPlatesBusy =
    !project.backgroundPlateError &&
    activePlates.some((plate) => !plate.url);

  const locksFailed = Boolean(project.objectSheetError || project.backgroundPlateError);

  return {
    propsTotal,
    propsDone,
    propNames,
    platesTotal,
    platesDone,
    plateNames,
    locksBusy: objectSheetBusy || backgroundPlatesBusy,
    locksFailed,
  };
}

function buildStepsList(
  activeStep: VideoPipelineStepNumber,
  failed: boolean,
): VideoPipelineStepItem[] {
  return STAGE_ORDER.map(({ number, id }) => {
    let state: VideoPipelineStepState;
    if (number < activeStep) {
      state = "done";
    } else if (number === activeStep) {
      if (failed) state = "failed";
      else if (activeStep === 5) state = "done";
      else state = "current";
    } else {
      state = "todo";
    }
    return {
      number,
      fraction: `${number}/5`,
      id,
      state,
    };
  });
}

// Compute the 5-step pipeline status (1/5 .. 5/5) and detailed counters from a full project/video.
export function computeVideoPipelineProgress(
  project: ClipStageSource & {
    backgroundPlates?: Array<{
      setId: string;
      name?: string;
      clipNumbers: number[];
      url?: string;
    }>;
  },
): VideoPipelineProgress {
  const status = normalizeProjectStatus(project.status);
  const locks = summarizeVideoLocks(project);
  const counts = productionCounts(project);
  const queue = inFlightCounts(project);

  const framesBusy = queue.framesQueued + queue.framesGenerating > 0;
  const videosBusy = queue.videosQueued + queue.videosGenerating > 0;
  const anyFrameFailed = (project.frames || []).some((f) => f.status === "failed");
  const anyVideoFailed = project.clips.some((c) => c.status === "failed");

  let step: VideoPipelineStepNumber;
  let stageId: VideoPipelineStageId;
  let busy = false;
  let failed = false;

  if (status === "phase_a" || status === "draft" || counts.total === 0) {
    step = 1;
    stageId = "storyboard";
    busy = status === "phase_a";
    failed = status === "failed";
  } else if (locks.locksBusy) {
    step = 2;
    stageId = "locks";
    busy = true;
    failed = false;
  } else if (framesBusy || counts.framesDone < counts.total) {
    step = 3;
    stageId = "frames";
    busy = framesBusy;
    failed = !framesBusy && (anyFrameFailed || status === "failed");
  } else if (videosBusy || counts.videosDone < counts.total) {
    step = 4;
    stageId = "videos";
    busy = videosBusy;
    failed = !videosBusy && (anyVideoFailed || status === "failed");
  } else {
    step = 5;
    stageId = "ready";
    busy = false;
    failed = false;
  }

  // Smooth percentage across the 5 stages (each stage spans 20%).
  let percent = 10;
  if (step === 1) {
    percent = busy ? 15 : 5;
  } else if (step === 2) {
    const lockUnitsTotal = Math.max(1, locks.propsTotal + locks.platesTotal);
    const lockUnitsDone = locks.propsDone + locks.platesDone;
    percent = 20 + Math.round((lockUnitsDone / lockUnitsTotal) * 20);
  } else if (step === 3) {
    const ratio = counts.total > 0 ? counts.framesDone / counts.total : 0;
    percent = 40 + Math.round(ratio * 25);
  } else if (step === 4) {
    const ratio = counts.total > 0 ? counts.videosDone / counts.total : 0;
    percent = 65 + Math.round(ratio * 30);
  } else {
    percent = 100;
  }

  return {
    step,
    totalSteps: TOTAL_VIDEO_PIPELINE_STEPS,
    stepFraction: `${step}/5`,
    stageId,
    busy,
    failed,
    percent,
    steps: buildStepsList(step, failed),
    locks,
    framesDone: counts.framesDone,
    framesTotal: counts.total,
    framesQueued: queue.framesQueued,
    framesGenerating: queue.framesGenerating,
    videosDone: counts.videosDone,
    videosTotal: counts.total,
    videosQueued: queue.videosQueued,
    videosGenerating: queue.videosGenerating,
  };
}

// Lightweight 5-step progress derivation for folder video cards.
export function computeCardPipelineProgress(card: {
  status: ProjectStatus;
  videosDone: number;
  videosTotal: number;
  tags: GenerationDetailTag[];
  locksBusy?: boolean;
  propsTotal?: number;
  propsDone?: number;
  platesTotal?: number;
  platesDone?: number;
}): {
  step: VideoPipelineStepNumber;
  totalSteps: typeof TOTAL_VIDEO_PIPELINE_STEPS;
  stepFraction: `${VideoPipelineStepNumber}/5`;
  stageId: VideoPipelineStageId;
  busy: boolean;
  failed: boolean;
  scenesDone: number;
  scenesTotal: number;
  scenesBusy: number;
  videosDone: number;
  videosTotal: number;
  videosBusy: number;
  propsTotal: number;
  propsDone: number;
  platesTotal: number;
  platesDone: number;
} {
  const scenes = card.tags.filter((tag) => tag.kind === "scene");
  const videos = card.tags.filter((tag) => tag.kind === "video");
  const scenesTotal = scenes.length || card.videosTotal;
  const scenesDone = scenes.filter((tag) => tag.state === "ready").length;
  const scenesBusy = scenes.filter((tag) => tag.state === "busy").length;
  const scenesFailed = scenes.some((tag) => tag.state === "failed");

  const videosTotal = card.videosTotal || videos.length;
  const videosDone = card.videosDone;
  const videosBusy = videos.filter((tag) => tag.state === "busy").length;
  const videosFailed = videos.some((tag) => tag.state === "failed");

  const propsTotal = card.propsTotal ?? 0;
  const propsDone = card.propsDone ?? 0;
  const platesTotal = card.platesTotal ?? 0;
  const platesDone = card.platesDone ?? 0;

  let step: VideoPipelineStepNumber;
  let stageId: VideoPipelineStageId;
  let busy = false;
  let failed = false;

  if (card.status === "phase_a" || card.status === "draft" || videosTotal === 0) {
    step = 1;
    stageId = "storyboard";
    busy = card.status === "phase_a";
    failed = card.status === "failed";
  } else if (card.locksBusy) {
    step = 2;
    stageId = "locks";
    busy = true;
    failed = false;
  } else if (scenesBusy > 0 || scenesDone < scenesTotal) {
    step = 3;
    stageId = "frames";
    busy = scenesBusy > 0;
    failed = !busy && (scenesFailed || card.status === "failed");
  } else if (videosBusy > 0 || videosDone < videosTotal) {
    step = 4;
    stageId = "videos";
    busy = videosBusy > 0;
    failed = !busy && (videosFailed || card.status === "failed");
  } else {
    step = 5;
    stageId = "ready";
    busy = false;
    failed = false;
  }

  return {
    step,
    totalSteps: TOTAL_VIDEO_PIPELINE_STEPS,
    stepFraction: `${step}/5`,
    stageId,
    busy,
    failed,
    scenesDone,
    scenesTotal,
    scenesBusy,
    videosDone,
    videosTotal,
    videosBusy,
    propsTotal,
    propsDone,
    platesTotal,
    platesDone,
  };
}
