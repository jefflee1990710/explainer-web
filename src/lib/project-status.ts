import type {
  ClipFrame,
  LegacyProjectStatus,
  PhaseAProposal,
  ProjectStatus,
} from "@/types/project";

// Visual tone for status badges; maps to Tailwind classes in StatusBadge.
export type StatusTone = "neutral" | "working" | "action" | "success" | "danger";

export type StatusMeta = {
  tone: StatusTone;
  // Index into PROJECT_STEPS that this status belongs to.
  step: number;
  // True while a background job is running for this status.
  busy: boolean;
};

export const PROJECT_STEP_IDS = ["input", "scene", "production", "export"] as const;

// 題材 → 分鏡 → 製作 → 成片. Export unlocks after every clip is video_ready.
export const PROJECT_STEPS = PROJECT_STEP_IDS.map((id) => ({ id }));

export type StepVisualState = "done" | "current" | "todo";

// Production stays current until all clips are ready; export is current once
// unlocked and not yet concatenated. ready.step stays 2 so Next is required.
export function stepVisualState(
  index: number,
  current: number,
  clipsReady: boolean,
  reelReady: boolean,
): StepVisualState {
  const exportIndex = PROJECT_STEPS.length - 1;
  if (index < exportIndex) {
    if (index < current || (clipsReady && index <= 2)) return "done";
    if (index === current) return "current";
    return "todo";
  }
  if (reelReady) return "done";
  if (clipsReady) return "current";
  return "todo";
}

export function maxReachableStep(current: number, clipsReady: boolean) {
  return clipsReady ? PROJECT_STEPS.length - 1 : current;
}

export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  draft: { tone: "neutral", step: 0, busy: false },
  phase_a: { tone: "working", step: 1, busy: true },
  awaiting_approval: { tone: "action", step: 1, busy: false },
  // Static `busy` so folder rollups / dashboard filters work from statuses alone;
  // components with the full project use isProjectBusy() for the precise answer.
  production: { tone: "working", step: 2, busy: true },
  ready: { tone: "success", step: 2, busy: false },
  failed: { tone: "danger", step: 0, busy: false },
};

const LEGACY_PRODUCTION = new Set<string>([
  "frames_generating",
  "frames_ready",
  "approved",
  "generating",
]);

// Pre per-clip statuses read as `production`.
export function normalizeProjectStatus(
  status: ProjectStatus | LegacyProjectStatus,
): ProjectStatus {
  return LEGACY_PRODUCTION.has(status) ? "production" : (status as ProjectStatus);
}

// True once the storyboard is approved and clips may be produced/redone.
export function isProductionLike(status: ProjectStatus | LegacyProjectStatus) {
  const normalized = normalizeProjectStatus(status);
  return normalized === "production" || normalized === "ready";
}

// A failed project either never got a storyboard (step 1) or failed later (step 2).
export function failedStepFor(project: {
  phaseA?: PhaseAProposal;
  frames?: ClipFrame[];
}) {
  return project.phaseA ? 2 : 1;
}

// Filter groups used on the dashboard.
export type StatusFilter = "all" | "active" | "action" | "ready" | "failed";

export const STATUS_FILTER_IDS: StatusFilter[] = [
  "all",
  "action",
  "active",
  "ready",
  "failed",
];

export function matchesFilter(status: ProjectStatus, filter: StatusFilter) {
  if (filter === "all") return true;
  const meta = STATUS_META[status];
  if (filter === "active") return meta.busy;
  if (filter === "action") return meta.tone === "action";
  if (filter === "ready") return status === "ready";
  return status === "failed";
}
