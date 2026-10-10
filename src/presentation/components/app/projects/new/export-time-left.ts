import type { ExportJob, ExportPhase } from "@/presentation/components/app/projects/new/browser-video-export";

// Relative time each stage usually takes. Save is a file write; encode and join dominate.
const PHASE_WEIGHT: Record<ExportPhase, number> = {
  encoder: 2,
  download: 4,
  join: 10,
  encode: 12,
  save: 1,
};

// 0–1 across the whole export, so a phase that just started does not look finished.
export function overallExportRatio(job: Pick<ExportJob, "phase" | "ratio" | "phases">) {
  const weights = job.phases.map((phase) => PHASE_WEIGHT[phase]);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const index = job.phases.indexOf(job.phase);
  const done = index <= 0 ? 0 : weights.slice(0, index).reduce((sum, weight) => sum + weight, 0);
  const within = Math.max(0, Math.min(1, job.ratio));
  const current = index < 0 ? 0 : weights[index] * within;
  return Math.min(1, (done + current) / total);
}

// Seconds left from elapsed time and overall progress. Null until there is a real sample.
export function rawExportSecondsLeft(elapsedMs: number, overall: number) {
  if (overall >= 0.995) return 0;
  if (overall < 0.04 || elapsedMs < 1200) return null;
  return Math.max(0, ((elapsedMs / overall) * (1 - overall)) / 1000);
}

// Blend a new sample into the previous estimate so the countdown does not jump.
export function smoothExportSecondsLeft(previous: number | null, raw: number | null) {
  if (raw == null) return previous;
  if (previous == null) return raw;
  return previous * 0.65 + raw * 0.35;
}

// Clock label: 0:45, 1:30, or 1:01:01.
export function formatExportTimeLeft(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remain = total % 60;
  const clock = `${minutes}:${String(remain).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}` : clock;
}
