"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type {
  DurationPreset,
  SceneTextChoice,
  SpeechPace,
  VoLanguage,
  VoiceGender,
} from "@/model/project";
import {
  DEFAULT_TALKING_HEAD_POSE_ID,
  defaultTalkingHeadDirectorInstruction,
  isDefaultTalkingHeadDirectorInstruction,
  isTalkingHeadPoseId,
  type TalkingHeadPoseId,
} from "@/model/talking-head-options";
import { CharacterPicker } from "@/presentation/components/app/projects/[id]/character-picker";
import { SkillPicker } from "@/presentation/components/app/projects/[id]/skill-picker";
import {
  defaultCastIdsForStyle,
  pickerDefaultSkillSlug,
} from "@/presentation/components/app/projects/new/brief-defaults";
import { DirectorBackgroundPicker } from "@/presentation/components/app/projects/new/director-background-picker";
import { DurationPicker } from "@/presentation/components/app/projects/new/duration-picker";
import { QuickScriptCard } from "@/presentation/components/app/projects/new/quick-script-card";
import {
  ruleSlugFor,
  selectedSkillSlugFor,
} from "@/presentation/components/app/projects/new/skill-selection";
import { TalkingHeadPoseField } from "@/presentation/components/app/projects/new/talking-head-pose-field";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { AddClipAfterOption } from "@/presentation/components/project/add-clip-dialog";
import { Spinner } from "@/presentation/components/spinner";
import { StylePicker } from "@/presentation/components/style-picker";
import type {
  PublicCharacter,
  PublicProduct,
  PublicSkill,
  PublicStyle,
  PublicVideo,
} from "@/presentation/serialize";
import { StudioButton } from "@/presentation/studio/studio-button";
import type { CharacterSelectionMap } from "@/service/character/character-presets";
import {
  defaultDirectorBackgroundId,
  directorPresetBackgrounds,
  isValidDirectorBackgroundId,
  requiredCastCount,
  skillAllowsBackgroundUpload,
} from "@/service/director/skill-rules";
import { DEFAULT_SPEECH_PACE } from "@/service/director/speech-pace";
import {
  isTalkingHeadSkill,
  TALKING_HEAD_SKILL_SLUG,
} from "@/service/director/talking-head";
import { DEFAULT_VOICE_GENDER } from "@/service/director/voice";
import { DEFAULT_STYLE_ID, pickerDefaultStyleId } from "@/service/style";

export type AppendDirectorDialogMode = "add-clip" | "add-video";

export type AppendDirectorSubmitPayload = {
  mode: "single_clip" | "full_video";
  content: string;
  spokenScript?: string;
  afterClipNumber?: number;
  skillSlug: string;
  styleId: string;
  characterIds: string[];
  characterSelections: CharacterSelectionMap;
  productIds: string[];
  language: VoLanguage;
  voiceGender: VoiceGender;
  speechPace: SpeechPace;
  sceneTextLanguage: SceneTextChoice;
  durationPreset: DurationPreset;
  directorBackgroundId?: string;
  backgroundImageUrls?: string[];
  talkingHeadPoseId?: TalkingHeadPoseId;
  logoUrl?: string;
  uploadedVoUrl?: string;
  uploadedVoDurationSeconds?: number;
};

function preferredStyleIdForSkill(
  slug: string,
  availableStyles: PublicStyle[],
): string | undefined {
  if (
    slug === "papercraft-diorama-director" &&
    availableStyles.some((s) => s.id === "papercraft-diorama")
  ) {
    return "papercraft-diorama";
  }
  if (
    slug === "paper-cutout-explainer-video-director" &&
    availableStyles.some((s) => s.id === "paper-cutout")
  ) {
    return "paper-cutout";
  }
  if (slug === "cartoon-explainer-video-director") {
    if (availableStyles.some((s) => s.id === "whiteboard")) return "whiteboard";
    if (availableStyles.some((s) => s.id === "cartoon")) return "cartoon";
  }
  return undefined;
}

// Modal inside the OpenCut editor for both "Add clip" (single clip at chosen slot)
// and "Add new video" (full Phase A storyboard appended after the last clip).
export function AppendDirectorDialog({
  mode,
  project,
  skills,
  styles,
  characters,
  products,
  credits,
  subscribed,
  afterOptions = [],
  defaultAfterClipNumber,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  mode: AppendDirectorDialogMode;
  project: PublicVideo;
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  products: PublicProduct[];
  credits: number;
  subscribed: boolean;
  afterOptions?: AddClipAfterOption[];
  defaultAfterClipNumber?: number | null;
  pending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (payload: AppendDirectorSubmitPayload) => void;
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const fallbackAfter = afterOptions.at(-1)?.clipNumber;
  const [afterClipNumber, setAfterClipNumber] = useState<number | undefined>(
    afterOptions.some((option) => option.clipNumber === defaultAfterClipNumber)
      ? defaultAfterClipNumber!
      : fallbackAfter,
  );

  const initialSkillSlug =
    selectedSkillSlugFor(project, skills) || pickerDefaultSkillSlug(skills);
  const [skillSlug, setSkillSlug] = useState<string>(initialSkillSlug);
  const ruleSlug = ruleSlugFor(skillSlug, skills);
  const talkingHead = isTalkingHeadSkill(ruleSlug);
  const talkingHeadBackground = ruleSlug === TALKING_HEAD_SKILL_SLUG;
  const presetBackgrounds = directorPresetBackgrounds(ruleSlug);
  const allowsBgUpload = skillAllowsBackgroundUpload(ruleSlug);
  const castNeed = requiredCastCount(ruleSlug);

  const [styleId, setStyleId] = useState<string>(
    project.styleId || pickerDefaultStyleId(styles) || DEFAULT_STYLE_ID,
  );
  const [characterIds, setCharacterIds] = useState<string[]>(() =>
    project.cast.map((member) => member.characterId),
  );
  const [characterSelections, setCharacterSelections] = useState<CharacterSelectionMap>(() => {
    const initialMap: CharacterSelectionMap = {};
    for (const member of project.cast) {
      if (member.versionId || member.presetId || member.presetName) {
        initialMap[member.characterId] = {
          ...(member.versionId ? { versionId: member.versionId } : {}),
          ...(member.presetId ? { presetId: member.presetId } : {}),
          ...(member.presetName ? { presetName: member.presetName } : {}),
        };
      }
    }
    return initialMap;
  });
  const [productIds] = useState<string[]>(() =>
    (project.products ?? []).map((item) => item.productId),
  );
  const [language, setLanguage] = useState<VoLanguage>(project.language || "en");
  const [voiceGender] = useState<VoiceGender>(
    project.voiceGender || DEFAULT_VOICE_GENDER,
  );
  const [speechPace] = useState<SpeechPace>(
    project.speechPace || DEFAULT_SPEECH_PACE,
  );
  const [sceneTextLanguage, setSceneTextLanguage] = useState<SceneTextChoice>(
    project.sceneTextLanguage || "en",
  );
  const [durationPreset, setDurationPreset] = useState<DurationPreset>("auto");
  const [directorBackgroundId, setDirectorBackgroundId] = useState<string>(() => {
    const initRule = ruleSlugFor(initialSkillSlug, skills);
    return (
      (isValidDirectorBackgroundId(initRule, project.directorBackgroundId)
        ? project.directorBackgroundId
        : undefined) ||
      defaultDirectorBackgroundId(initRule) ||
      ""
    );
  });
  const [directorBackgroundDialogOpen, setDirectorBackgroundDialogOpen] =
    useState(false);
  const [backgroundImageUrls, setBackgroundImageUrls] = useState<string[]>(
    project.backgroundImageUrls || [],
  );
  const [talkingHeadPoseId, setTalkingHeadPoseId] = useState<TalkingHeadPoseId>(() =>
    isTalkingHeadPoseId(project.talkingHeadPoseId)
      ? project.talkingHeadPoseId
      : DEFAULT_TALKING_HEAD_POSE_ID,
  );
  const [source, setSource] = useState<string>(() =>
    isTalkingHeadSkill(ruleSlugFor(initialSkillSlug, skills))
      ? defaultTalkingHeadDirectorInstruction(locale)
      : "",
  );
  const [spokenScript, setSpokenScript] = useState<string>("");
  const [uploadedVoUrl, setUploadedVoUrl] = useState<string | undefined>(undefined);
  const [uploadedVoDurationSeconds, setUploadedVoDurationSeconds] = useState<
    number | undefined
  >(undefined);
  const [localError, setLocalError] = useState<string>("");

  // Close on Escape when idle and no nested dialog is open.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (pending || directorBackgroundDialogOpen) return;
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, directorBackgroundDialogOpen, onCancel]);

  function onStyleChange(nextStyleId: string) {
    setStyleId(nextStyleId);
    setCharacterSelections({});
    setCharacterIds((ids) => {
      if (nextStyleId === "papercraft-diorama") return [];
      const kept = ids.filter((cid) => {
        const character = characters.find((c) => c.id === cid);
        const charStyles = character?.styleIds?.length
          ? character.styleIds
          : [character?.styleId];
        return charStyles.includes(nextStyleId);
      });
      const targetCount = Math.max(castNeed, ids.length > 0 ? 1 : 0);
      if (kept.length >= targetCount) return kept.slice(0, Math.max(1, targetCount));
      return defaultCastIdsForStyle(characters, nextStyleId, targetCount);
    });
  }

  function onSkillChange(nextSlug: string) {
    setSkillSlug(nextSlug);
    const nextRuleSlug = ruleSlugFor(nextSlug, skills);
    if (isTalkingHeadSkill(nextRuleSlug) && !source.trim()) {
      setSource(defaultTalkingHeadDirectorInstruction(locale));
    } else if (
      !isTalkingHeadSkill(nextRuleSlug) &&
      isDefaultTalkingHeadDirectorInstruction(source)
    ) {
      setSource("");
    }
    const nextPresets = directorPresetBackgrounds(nextRuleSlug);
    const matchedStyleId = preferredStyleIdForSkill(nextRuleSlug, styles);
    const targetStyleId = matchedStyleId ?? styleId;
    if (matchedStyleId && matchedStyleId !== styleId) {
      onStyleChange(matchedStyleId);
    }
    if (nextPresets.length > 0) {
      if (!isValidDirectorBackgroundId(nextRuleSlug, directorBackgroundId)) {
        setDirectorBackgroundId(
          defaultDirectorBackgroundId(nextRuleSlug) || nextPresets[0]!.id,
        );
      }
    } else {
      setDirectorBackgroundDialogOpen(false);
    }
    const nextNeed = requiredCastCount(nextRuleSlug);
    if (nextNeed > 0) {
      setCharacterIds((ids) => {
        if (ids.length > nextNeed) return ids.slice(0, nextNeed);
        if (ids.length < nextNeed) {
          return defaultCastIdsForStyle(characters, targetStyleId, nextNeed);
        }
        return ids;
      });
    }
  }

  function onVoLanguageChange(nextLanguage: VoLanguage) {
    setLanguage(nextLanguage);
    if (sceneTextLanguage !== "none") {
      if (nextLanguage === "yue") {
        setSceneTextLanguage("zh-Hant");
      } else if (nextLanguage === "zh") {
        setSceneTextLanguage(locale === "zh-Hans" ? "zh-Hans" : "zh-Hant");
      } else {
        setSceneTextLanguage("en");
      }
    }
  }

  const chosenAfter = afterOptions.find(
    (option) => option.clipNumber === afterClipNumber,
  );
  const following = afterOptions.find(
    (option) => option.clipNumber === (afterClipNumber ?? 0) + 1,
  );
  const lastOption = afterOptions.at(-1);
  const resolvedPlace = chosenAfter
    ? following
      ? t("production.filmstrip.addBetween", {
          before: chosenAfter.title,
          after: following.title,
        })
      : t("production.filmstrip.addAfter", { title: chosenAfter.title })
    : t("production.filmstrip.addClip");

  const hasSpokenOrContent = talkingHead
    ? spokenScript.trim().length > 0 || Boolean(uploadedVoUrl)
    : source.trim().length > 0;
  const castValid = castNeed === 0 || characterIds.length === castNeed;
  const canConfirm =
    !pending &&
    skillSlug !== "" &&
    castValid &&
    hasSpokenOrContent &&
    (mode === "add-video" || afterOptions.length === 0 || chosenAfter != null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!castValid) {
      setLocalError(t("brief.error.castCount", { n: castNeed }));
      return;
    }
    if (!hasSpokenOrContent) {
      setLocalError(
        talkingHead
          ? t("brief.error.spokenScriptRequired")
          : t("production.filmstrip.addPlaceholder"),
      );
      return;
    }
    setLocalError("");

    onConfirm({
      mode: mode === "add-video" ? "full_video" : "single_clip",
      content: source.trim(),
      spokenScript: talkingHead ? spokenScript.trim() : undefined,
      afterClipNumber:
        mode === "add-video" ? lastOption?.clipNumber : chosenAfter?.clipNumber,
      skillSlug,
      styleId,
      characterIds,
      characterSelections,
      productIds: products.length > 0 ? productIds : [],
      language,
      voiceGender,
      speechPace,
      sceneTextLanguage,
      durationPreset,
      directorBackgroundId:
        presetBackgrounds.length > 0 && directorBackgroundId
          ? directorBackgroundId
          : undefined,
      backgroundImageUrls:
        talkingHeadBackground || allowsBgUpload ? backgroundImageUrls : undefined,
      talkingHeadPoseId: talkingHeadBackground ? talkingHeadPoseId : undefined,
      logoUrl: project.logoUrl,
      uploadedVoUrl: talkingHead ? uploadedVoUrl : undefined,
      uploadedVoDurationSeconds: talkingHead
        ? uploadedVoDurationSeconds
        : undefined,
    });
  }

  if (typeof document === "undefined") return null;

  const displayedError = localError || error;
  const isAddVideo = mode === "add-video";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[210] flex flex-col overflow-y-auto bg-black/55 p-3 backdrop-blur-xs sm:p-6"
      onClick={pending ? undefined : onCancel}
    >
      <div className="mx-auto my-auto w-full max-w-6xl">
        <form
          onClick={(event) => event.stopPropagation()}
          onSubmit={handleSubmit}
          className="studio-app flex flex-col overflow-hidden rounded-[1.5rem] border-2 border-accent-ink bg-[var(--studio-panel)] text-foreground shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        >
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--studio-line)] bg-white px-5 py-4 sm:px-6 sm:py-5">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id={titleId}
                  className="font-display text-xl font-bold text-foreground sm:text-2xl"
                >
                  {isAddVideo
                    ? t("production.filmstrip.addVideoTitle")
                    : t("production.filmstrip.addTitle")}
                </h2>
                <span className="rounded-full border border-accent-ink/15 bg-paper px-2.5 py-0.5 font-display text-xs font-bold text-accent-ink">
                  {project.aspectRatio}
                </span>
                {isAddVideo && lastOption ? (
                  <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-accent-ink">
                    {t("production.filmstrip.addAfter", { title: lastOption.title })}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--studio-muted)] sm:text-sm">
                {isAddVideo
                  ? t("production.filmstrip.addVideoBody")
                  : t("production.filmstrip.addClipDirectorBody", {
                      place: resolvedPlace,
                    })}
              </p>
            </div>

            <StudioButton
              variant="ghost"
              onClick={onCancel}
              disabled={pending}
            >
              {t("production.action.cancel")}
            </StudioButton>
          </div>

          {/* Body */}
          <div className="max-h-[calc(100dvh-11rem)] space-y-4 overflow-y-auto p-4 sm:p-6">
            {/* Slot selector for Add Clip OR Duration picker for Add Video */}
            {!isAddVideo && afterOptions.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-ink/12 bg-white px-4 py-3 shadow-[0_2px_10px_rgba(18,20,28,0.03)]">
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {t("production.filmstrip.addAfterLabel")}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {t("production.filmstrip.addAfterHint")}
                  </span>
                </div>
                <select
                  value={afterClipNumber ?? ""}
                  disabled={pending}
                  onChange={(event) =>
                    setAfterClipNumber(Number(event.target.value))
                  }
                  className="min-w-52 rounded-xl border border-[var(--studio-line)] bg-paper px-3 py-2 text-sm font-medium outline-none focus:border-[var(--studio-ink)]"
                >
                  {afterOptions.map((option) => (
                    <option key={option.clipNumber} value={option.clipNumber}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {isAddVideo && !talkingHead ? (
              <div className="rounded-2xl border border-accent-ink/12 bg-white p-4 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:p-5">
                <CardHeader
                  step="00"
                  title={t("brief.section06.title")}
                  hint={t("brief.section06.hint")}
                />
                <div className="mt-3">
                  <DurationPicker
                    value={durationPreset}
                    onChange={setDurationPreset}
                    disabled={pending}
                  />
                </div>
              </div>
            ) : null}

            {/* 3-Column Studio Cards: 01 Director · 02 Style · 03 Character */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-stretch">
              <div className="flex flex-col justify-between rounded-2xl border border-accent-ink/12 bg-white p-4 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:p-5">
                <div>
                  <CardHeader
                    step="01"
                    title={t("brief.section01.title")}
                    hint={t("brief.section01.hint")}
                    equalHeaderHeight
                  />
                  <div className="mt-3">
                    <SkillPicker
                      skills={skills}
                      value={skillSlug}
                      onChange={onSkillChange}
                      disabled={pending}
                    />
                  </div>
                </div>
                {talkingHeadBackground ? (
                  <div className="mt-4 border-t border-accent-ink/10 pt-4">
                    <TalkingHeadPoseField
                      value={talkingHeadPoseId}
                      onChange={setTalkingHeadPoseId}
                      disabled={pending}
                    />
                  </div>
                ) : null}
                {presetBackgrounds.length > 0 ? (
                  <div className="mt-4 border-t border-accent-ink/10 pt-4">
                    <DirectorBackgroundPicker
                      presets={presetBackgrounds}
                      selectedId={
                        directorBackgroundId ||
                        defaultDirectorBackgroundId(ruleSlug) ||
                        ""
                      }
                      customUrls={backgroundImageUrls}
                      allowsUpload={allowsBgUpload}
                      open={directorBackgroundDialogOpen}
                      disabled={pending}
                      onOpenChange={setDirectorBackgroundDialogOpen}
                      onSelectPreset={setDirectorBackgroundId}
                      onChangeCustomUrls={setBackgroundImageUrls}
                      onError={setLocalError}
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-accent-ink/12 bg-white p-4 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:p-5">
                <CardHeader
                  step="02"
                  title={t("brief.visualStyle.title")}
                  hint={t("brief.visualStyle.hint")}
                  equalHeaderHeight
                />
                <div className="mt-3 flex-1">
                  <StylePicker
                    styles={styles}
                    value={styleId}
                    onChange={onStyleChange}
                    disabled={pending}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-accent-ink/12 bg-white p-4 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:p-5">
                <CardHeader
                  step="03"
                  title={t("brief.cast.title")}
                  hint={
                    castNeed === 2
                      ? t("brief.cast.hintRequiredTwo")
                      : castNeed === 1
                        ? t("brief.cast.hintRequiredOne")
                        : t("brief.cast.hintOptional")
                  }
                  equalHeaderHeight
                />
                <div className="mt-3 flex-1">
                  <CharacterPicker
                    characters={characters}
                    styles={styles}
                    styleId={styleId}
                    value={characterIds}
                    onChange={setCharacterIds}
                    onSelectStyle={onStyleChange}
                    selections={characterSelections}
                    onSelectionsChange={setCharacterSelections}
                    credits={credits}
                    subscribed={subscribed}
                    disabled={pending}
                    max={castNeed > 0 ? castNeed : 1}
                    required={castNeed}
                  />
                </div>
              </div>
            </div>

            {/* 04 Content / Script */}
            <QuickScriptCard
              step="04"
              source={source}
              onSourceChange={(val) => {
                setSource(val);
                if (localError) setLocalError("");
              }}
              talkingHead={talkingHead}
              spokenScript={spokenScript}
              onSpokenScriptChange={(val) => {
                setSpokenScript(val);
                if (localError) setLocalError("");
              }}
              uploadedVoUrl={uploadedVoUrl}
              uploadedVoDurationSeconds={uploadedVoDurationSeconds}
              onUploadedVoChange={({ url, durationSeconds }) => {
                setUploadedVoUrl(url);
                setUploadedVoDurationSeconds(durationSeconds);
                if (localError) setLocalError("");
              }}
              onError={setLocalError}
              language={language}
              onLanguageChange={onVoLanguageChange}
              disabled={pending}
              actionSlot={
                <>
                  {displayedError ? (
                    <p
                      role="alert"
                      className="w-full text-sm font-medium text-accent"
                    >
                      {displayedError}
                    </p>
                  ) : null}
                  {castNeed > 0 && characterIds.length !== castNeed ? (
                    <p className="text-xs text-muted">
                      {t("brief.footer.castRequired", { n: castNeed })}
                    </p>
                  ) : null}
                  <StudioButton
                    variant="ghost"
                    onClick={onCancel}
                    disabled={pending}
                  >
                    {t("production.action.cancel")}
                  </StudioButton>
                  <button
                    type="submit"
                    disabled={!canConfirm}
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {pending ? <Spinner className="h-4 w-4" /> : null}
                    {pending
                      ? t("production.filmstrip.addPending")
                      : isAddVideo
                        ? t("production.filmstrip.addVideoConfirm")
                        : t("production.filmstrip.addConfirm")}
                  </button>
                </>
              }
            />
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function CardHeader({
  step,
  title,
  hint,
  equalHeaderHeight = false,
}: {
  step: string;
  title: string;
  hint: string;
  equalHeaderHeight?: boolean;
}) {
  return (
    <div className={equalHeaderHeight ? "min-h-[3.75rem]" : ""}>
      <div className="flex items-center gap-2.5">
        <span className="rounded-full bg-lime px-2.5 py-0.5 font-display text-xs font-bold text-accent-ink">
          {step}
        </span>
        <span className="font-display text-base font-bold text-foreground">
          {title}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted">{hint}</p>
    </div>
  );
}
