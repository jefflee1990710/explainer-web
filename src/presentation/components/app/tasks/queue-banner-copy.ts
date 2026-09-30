// Copy and visibility for the sticky queue banner.

export function queueBannerPending(queuedCount: number, loaded: boolean, initialPending: number) {
  return !loaded && queuedCount === 0 ? initialPending : queuedCount;
}

export function shouldShowQueueBanner(pending: number) {
  return pending > 0;
}

export function queueBannerMessage(
  queued: Array<{ title: string; detail: string }>,
  pending: number,
  pendingLabel: string,
) {
  const lead = queued[0];
  if (!lead) return `${pending} ${pendingLabel}`;
  const head = lead.detail || lead.title;
  if (pending <= 1) return head;
  return `${head} · ${pending} ${pendingLabel}`;
}
