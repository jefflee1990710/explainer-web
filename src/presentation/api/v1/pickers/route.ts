import { apiJson, withApiUser } from "@/service/api/respond";
import { DURATION_PRESETS } from "@/service/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { SCENE_TEXT_PRESETS } from "@/service/director/scene-text";
import { SPEECH_PACE_PRESETS } from "@/service/director/speech-pace";
import {
  isBookendSkill,
  requiredCastCount,
  skillBansNarration,
  skillForcesSceneText,
} from "@/service/director/skill-rules";
import { SYSTEM_TEXT_STYLE_ORDER, systemTextStylePreview } from "@/service/director/subtitle-look";
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import { VOICE_PRESETS } from "@/service/director/voice";
import { loadStudioPickers } from "@/service/project/load-folder-studio";
import { FRAME_COST, FRAMES_COST, VIDEO_CREDITS_PER_SECOND } from "@/service/credit-costs";
import { getAppUrl } from "@/util/app-url";

// Everything the brief form needs: directors, styles, cast, products, lettering,
// fixed option lists, and per-director rules (so the app mirrors the web form).
export const GET = withApiUser(async ({ auth }) => {
  const pickers = await loadStudioPickers(auth.user);
  const appUrl = getAppUrl();
  return apiJson({
    ...pickers,
    credits: auth.user.credits,
    systemTextStyles: SYSTEM_TEXT_STYLE_ORDER.map((id) => ({
      id,
      previewUrl: `${appUrl}${systemTextStylePreview(id)}`,
    })),
    options: {
      aspectRatios: ["16:9", "9:16", "1:1"],
      durations: Object.values(DURATION_PRESETS).map(({ id, label, hint }) => ({ id, label, hint })),
      languages: Object.values(LANGUAGE_PRESETS).map(({ id, label, sublabel }) => ({ id, label, sublabel })),
      voices: Object.values(VOICE_PRESETS).map(({ id, label, sublabel }) => ({ id, label, sublabel })),
      speechPaces: Object.values(SPEECH_PACE_PRESETS).map(({ id, label, sublabel }) => ({ id, label, sublabel })),
      sceneTextLanguages: Object.values(SCENE_TEXT_PRESETS).map(({ id, label, sublabel }) => ({ id, label, sublabel })),
    },
    // Behaviour-slug rules keyed by director slug.
    rules: Object.fromEntries(
      pickers.skills.map((skill) => [
        skill.slug,
        {
          requiredCast: requiredCastCount(skill.behaviorSlug),
          bansNarration: skillBansNarration(skill.behaviorSlug),
          forcesSceneText: skillForcesSceneText(skill.behaviorSlug),
          talkingHead: isTalkingHeadSkill(skill.behaviorSlug),
          bookend: isBookendSkill(skill.behaviorSlug),
        },
      ]),
    ),
    costs: {
      frame: FRAME_COST,
      frames: FRAMES_COST,
      videoPerSecond: VIDEO_CREDITS_PER_SECOND,
    },
  });
});
