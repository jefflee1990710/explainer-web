import { toUsdUnits } from "@/service/billing/usd";

// Server actions throw these when a paid generate cannot run.
export function isCreditGateError(error?: string) {
  const detail = error || "";
  const lower = detail.toLowerCase();
  return (
    detail.includes("訂閱") ||
    detail.includes("餘額不足") ||
    detail.includes("USD Credit") ||
    detail.includes("credits 不足") ||
    lower.includes("insufficient")
  );
}

export type CreditSnapshotMarker = {
  creditUsd: number;
  subscribed: boolean;
  planId?: string | null;
};

// Snapshot moved after a pack top-up, a new subscription, or a plan upgrade landed.
export function creditGrantLanded(
  previous: CreditSnapshotMarker,
  next: CreditSnapshotMarker,
) {
  return (
    toUsdUnits(next.creditUsd) > toUsdUnits(previous.creditUsd) ||
    (!previous.subscribed && next.subscribed) ||
    Boolean(previous.planId && next.planId && previous.planId !== next.planId)
  );
}
