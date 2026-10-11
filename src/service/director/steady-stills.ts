import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import { isCinematicRealistic } from "@/service/style/prompts";

// Cinematic realistic 白板片段：兩張靜幀同鏡頭、同一句字幕，只差一個動作。
// 照片級的影片模型滑不過一次換字或換角度，所以差距只留給動作本身。
export function usesSteadyStills(
  skillSlug: string | undefined,
  style: { id?: string; name?: string } | undefined,
) {
  return skillSlug === CARTOON_EXPLAINER_SKILL_SLUG && Boolean(style && isCinematicRealistic(style));
}
