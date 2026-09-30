// Server actions throw these when a paid generate cannot run.

export function isCreditGateError(error?: string) {
  const detail = error || "";
  return detail.includes("訂閱") || detail.includes("credits 不足");
}

// Snapshot moved after a pack, a new subscription, or a plan upgrade landed.
export function creditGrantLanded(
  previous: { credits: number; subscribed: boolean; planId?: string | null },
  next: { credits: number; subscribed: boolean; planId?: string | null },
) {
  return (
    next.credits > previous.credits ||
    (!previous.subscribed && next.subscribed) ||
    Boolean(previous.planId && next.planId && previous.planId !== next.planId)
  );
}
