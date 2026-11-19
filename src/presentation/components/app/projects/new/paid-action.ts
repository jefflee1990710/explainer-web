import type { PublicVideo } from "@/presentation/serialize";
import { FRAME_COST_USD, FRAMES_COST_USD, MIN_VIDEO_COST_USD } from "@/service/production-plan";

export type PaidActionResult =
  | { ok: true; project?: PublicVideo }
  | { ok: false; error: string };

// USD cost already charged by the matching enqueue action. Bulk keys stay 0;
// those actions still return the full project and refresh the wallet.
// Video is per second, so callers pass the clip's real USD cost; this is the floor.
export function costForPaidKey(key: string): number {
  if (key.startsWith("video:")) return MIN_VIDEO_COST_USD;
  if (key.startsWith("frames:") || key.endsWith(":regen")) return FRAMES_COST_USD;
  if (key.startsWith("frame:")) return FRAME_COST_USD;
  return 0;
}

export function paidActionProject(result: PaidActionResult): PublicVideo | undefined {
  return result.ok ? result.project : undefined;
}
