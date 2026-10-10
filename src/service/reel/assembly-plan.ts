import type { EditTransition } from "@/model/video-edit";

export function isFade(transition: EditTransition | undefined) {
  return Boolean(transition && transition.effect !== "none" && transition.durationSec > 0);
}

// Group pieces that are joined by a fade. Each group is encoded once; groups are then
// stream-copied together with a short hold between them.
export function assemblyRuns(count: number, transitions: EditTransition[]): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  for (let index = 0; index < count; index += 1) {
    current.push(index);
    if (index === count - 1 || !isFade(transitions[index])) {
      runs.push(current);
      current = [];
    }
  }
  return runs;
}

export type AssemblyStage = "download" | "prepare" | "join";

// 0–1 across the whole assembly. Encoding fades costs far more than a stream copy.
export function assemblyRatio(stage: AssemblyStage, stageRatio: number, encodes: boolean) {
  const weights = encodes ? { download: 0.25, prepare: 0.1, join: 0.65 } : { download: 0.6, prepare: 0.25, join: 0.15 };
  const ratio = Math.max(0, Math.min(1, stageRatio));
  if (stage === "download") return weights.download * ratio;
  if (stage === "prepare") return weights.download + weights.prepare * ratio;
  return weights.download + weights.prepare + weights.join * ratio;
}
