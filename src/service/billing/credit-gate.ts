// Server actions throw these when a paid generate cannot run.

export function isCreditGateError(error?: string) {
  const detail = error || "";
  return detail.includes("訂閱") || detail.includes("credits 不足");
}

// Snapshot moved after a pack or a new subscription landed.
export function creditGrantLanded(
  previous: { credits: number; subscribed: boolean },
  next: { credits: number; subscribed: boolean },
) {
  return next.credits > previous.credits || (!previous.subscribed && next.subscribed);
}
