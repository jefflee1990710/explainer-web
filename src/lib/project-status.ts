import type { ClipFrame, PhaseAProposal, ProjectStatus } from "@/types/project";

// Visual tone for status badges; maps to Tailwind classes in StatusBadge.
export type StatusTone = "neutral" | "working" | "action" | "success" | "danger";

export type StatusMeta = {
  label: string;
  tone: StatusTone;
  // Index into PROJECT_STEPS that this status belongs to.
  step: number;
  // True while a background job is running for this status.
  busy: boolean;
};

// The four user-facing steps shown in the stepper.
export const PROJECT_STEPS = [
  { id: "input", label: "題材", hint: "Input" },
  { id: "scene", label: "分鏡", hint: "Scene" },
  { id: "frames", label: "分鏡圖", hint: "Frames" },
  { id: "video", label: "影片", hint: "Video" },
] as const;

export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  draft: { label: "草稿", tone: "neutral", step: 0, busy: false },
  phase_a: { label: "撰寫分鏡中", tone: "working", step: 1, busy: true },
  awaiting_approval: { label: "待核准分鏡", tone: "action", step: 1, busy: false },
  frames_generating: { label: "畫分鏡圖中", tone: "working", step: 2, busy: true },
  frames_ready: { label: "待核准分鏡圖", tone: "action", step: 2, busy: false },
  approved: { label: "準備產片", tone: "working", step: 3, busy: true },
  generating: { label: "產片中", tone: "working", step: 3, busy: true },
  ready: { label: "已完成", tone: "success", step: 3, busy: false },
  failed: { label: "失敗", tone: "danger", step: 0, busy: false },
};

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

export const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "action", label: "待處理" },
  { id: "active", label: "進行中" },
  { id: "ready", label: "已完成" },
  { id: "failed", label: "失敗" },
];

export function matchesFilter(status: ProjectStatus, filter: StatusFilter) {
  if (filter === "all") return true;
  const meta = STATUS_META[status];
  if (filter === "active") return meta.busy;
  if (filter === "action") return meta.tone === "action";
  if (filter === "ready") return status === "ready";
  return status === "failed";
}
