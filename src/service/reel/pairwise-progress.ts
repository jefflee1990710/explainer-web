// One step of "join the first two, then that result with the next clip".
export type PairwiseStep = {
  current: number;
  total: number;
  phase: "download" | "join";
};

// Downloads plus joins. Clip 1 is only a download; every later clip is a download and a join.
export function pairwiseUnitCount(total: number) {
  const clips = Math.max(1, total);
  return clips + Math.max(0, clips - 1);
}

// How many whole steps finished before this one starts.
export function pairwiseDoneUnits(step: PairwiseStep) {
  if (step.phase === "download") return step.current <= 1 ? 0 : step.current * 2 - 3;
  return step.current * 2 - 2;
}

// 0–1 across the whole assembly. unitRatio is progress inside the current download or join.
export function pairwiseRatio(step: PairwiseStep, unitRatio: number) {
  const units = pairwiseUnitCount(step.total);
  const done = pairwiseDoneUnits(step);
  const ratio = Math.max(0, Math.min(1, unitRatio));
  return Math.min(1, (done + ratio) / units);
}
