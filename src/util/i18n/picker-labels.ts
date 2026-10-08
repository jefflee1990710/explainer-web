import type { DurationPreset, SceneTextLanguage, SpeechPace, SubtitleLook, VoLanguage, VoiceGender } from "@/model/project";
import type { TranslateFn } from "@/util/i18n/translate";

export function voLanguageLabel(t: TranslateFn, id: VoLanguage) {
  return {
    label: t(`pickers.voLanguage.${id}.label`),
    sublabel: t(`pickers.voLanguage.${id}.sublabel`),
  };
}

export function sceneTextLangLabel(t: TranslateFn, id: SceneTextLanguage) {
  return {
    label: t(`pickers.sceneTextLang.${id}.label`),
    sublabel: t(`pickers.sceneTextLang.${id}.sublabel`),
  };
}

export function subtitleLookLabel(t: TranslateFn, id: SubtitleLook) {
  return {
    label: t(`pickers.subtitleLook.${id}.label`),
    sublabel: t(`pickers.subtitleLook.${id}.sublabel`),
  };
}

export function speechPaceLabel(t: TranslateFn, id: SpeechPace) {
  return {
    label: t(`pickers.speechPace.${id}.label`),
    sublabel: t(`pickers.speechPace.${id}.sublabel`),
  };
}

export function voiceGenderLabel(t: TranslateFn, id: VoiceGender) {
  return {
    label: t(`pickers.voiceGender.${id}.label`),
    sublabel: t(`pickers.voiceGender.${id}.sublabel`),
  };
}

export function durationPresetLabel(t: TranslateFn, id: DurationPreset) {
  return {
    label: t(`pickers.duration.${id}.label`),
    hint: t(`pickers.duration.${id}.hint`),
  };
}
