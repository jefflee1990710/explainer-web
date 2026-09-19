import type { ClipFrame, PhaseAProposal, ProjectStatus } from "@/types/project";

// Visual tone for status badges; maps to Tailwind classes in StatusBadge.
export type StatusTone = "neutral" | "working" | "action" | "success" | "danger";

export type StatusMeta = {
  tone: StatusTone;
  // Index into PROJECT_STEPS that this status belongs to.
  step: number;
  // True while a background job is running for this status.
  busy: boolean;
};

export const PROJECT_STEP_IDS = ["input", "scene", "frames", "video"] as const;

// The four user-facing steps shown in the stepper (labels via i18n).
export const PROJECT_STEPS = PROJECT_STEP_IDS.map((id) => ({ id }));

export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  draft: { tone: "neutral", step: 0, busy: false },
  phase_a: { tone: "working", step: 1, busy: true },
  awaiting_approval: { tone: "action", step: 1, busy: false },
  // Static `busy` so folder rollups / dashboard filters work from statuses alone;
  // components with the full project use isProjectBusy() for the precise answer.
  production: { tone: "working", step: 2, busy: true },
  frames_generating: { tone: "working", step: 2, busy: true },
  frames_ready: { tone: "action", step: 2, busy: false },
  approved: { tone: "working", step: 3, busy: true },
  generating: { tone: "working", step: 3, busy: true },
  ready: { tone: "success", step: 3, busy: false },
  failed: { tone: "danger", step: 0, busy: false },
};

const LEGACY_PRODUCTION = new Set<ProjectStatus>([
  "frames_generating",
  "frames_ready",
  "approved",
  "generating",
]);

// Pre per-clip statuses read as `production`.
export function normalizeProjectStatus(status: ProjectStatus): ProjectStatus {
  return LEGACY_PRODUCTION.has(status) ? "production" : status;
}

// True once the storyboard is approved and clips may be produced/redone.
export function isProductionLike(status: ProjectStatus) {
  const normalized = normalizeProjectStatus(status);
  return normalized === "production" || normalized === "ready";
}

// Infer which step a failed project fell over on from what it already has.
export function failedStepFor(project: {
  phaseA?: PhaseAProposal;
  frames?: ClipFrame[];
}) {
  if (!project.phaseA) return 1;
  const frames = project.frames || [];
  const framesDone =
    frames.length > 0 && frames.every((frame) => frame.status === "completed");
  return framesDone ? 3 : 2;
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
