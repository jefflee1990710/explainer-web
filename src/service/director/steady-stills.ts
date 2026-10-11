import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import { isCinematicRealistic } from "@/service/style/prompts";

// Cinematic realistic 白板片段。結束畫面仍寫成文字，用來產生動作；
// 不畫結尾圖，也不把結尾圖送給影片模型。影片只有起始圖加鏡頭動作。
export function usesSteadyStills(
  skillSlug: string | undefined,
  style: { id?: string; name?: string } | undefined,
) {
  return skillSlug === CARTOON_EXPLAINER_SKILL_SLUG && Boolean(style && isCinematicRealistic(style));
}

// 專案上只有 styleId。目錄裡的 Cinematic realistic 就是 "realistic"。
export function clipSkipsEndStill(project: { skillSlug?: string; styleId?: string }) {
  return usesSteadyStills(project.skillSlug, { id: project.styleId });
}
