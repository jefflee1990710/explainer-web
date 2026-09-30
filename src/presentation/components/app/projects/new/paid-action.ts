import type { PublicVideo } from "@/presentation/serialize";
import { FRAME_COST, FRAMES_COST, MIN_VIDEO_COST } from "@/service/production-plan";

export type PaidActionResult =
  | { ok: true; project?: PublicVideo }
  | { ok: false; error: string };

// Cost already charged by the matching enqueue action. Bulk keys stay 0;
// those actions still return the full project and refresh the wallet.
// Video is per second, so callers pass the clip's real cost; this is the floor.
export function costForPaidKey(key: string): number {
  if (key.startsWith("video:")) return MIN_VIDEO_COST;
  if (key.startsWith("frames:") || key.endsWith(":regen")) return FRAMES_COST;
  if (key.startsWith("frame:")) return FRAME_COST;
  return 0;
}

export function paidActionProject(result: PaidActionResult): PublicVideo | undefined {
  return result.ok ? result.project : undefined;
}
