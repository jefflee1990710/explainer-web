"use client";

import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  AspectRatio,
  DurationPreset,
  SceneTextChoice,
  SpeechPace,
  StoryboardClipDraft,
  VoLanguage,
  VoiceGender,
} from "@/model/project";
import {
  TALKING_HEAD_POSE_IDS,
  localizedTalkingHeadPose,
  resolveTalkingHeadPose,
  type TalkingHeadPoseId,
} from "@/model/talking-head-options";
import {
  buildCastSlotItems,
  cycleOption,
  DirectorDockCastGroup,
  DirectorDockComposer,
  DirectorDockDivider,
  DirectorDockDurationCell,
  DirectorDockHero,
  DirectorDockPanel,
  DirectorDockPill,
  DirectorDockStage,
  DirectorDockStepperCell,
  DirectorDockStyleButton,
  resolveCastSlotCount,
  resolveModeSwitchSkillSlug,
} from "@/presentation/components/app/director-dock";
import { CharacterManageDialog } from "@/presentation/components/app/projects/[id]/character-manage-dialog";
import {
  CharacterSelectDialog,
  defaultSheetForStyle,
} from "@/presentation/components/app/projects/[id]/character-select-dialog";
import { InlineCreateCharacterDialog } from "@/presentation/components/app/projects/[id]/inline-create-character-dialog";
import { SkillSelectDialog } from "@/presentation/components/app/projects/[id]/skill-select-dialog";
import { DirectorBackgroundPicker } from "@/presentation/components/app/projects/new/director-background-picker";
import { localizedDirectorBackground } from "@/presentation/components/app/projects/new/director-background-select-dialog";
import { LogoPicker } from "@/presentation/components/app/projects/new/logo-picker";
import { ProductDropdown } from "@/presentation/components/app/projects/new/product-dropdown";
import {
  ReferenceImagesField,
  type ReferenceImageDraft,
} from "@/presentation/components/app/projects/new/reference-images-field";
import { SampleScriptBar } from "@/presentation/components/app/projects/new/sample-script-bar";
import { StoryboardDraftsStep } from "@/presentation/components/app/projects/new/storyboard-drafts-step";
import { TalkingHeadBackgroundField } from "@/presentation/components/app/projects/new/talking-head-background-field";
import { TalkingHeadScriptField } from "@/presentation/components/app/projects/new/talking-head-script-field";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StyleSelectDialog } from "@/presentation/components/style-select-dialog";
import type {
  PublicCharacter,
  PublicProduct,
  PublicSkill,
  PublicStyle,
} from "@/presentation/serialize";
import type { CharacterSelectionMap } from "@/service/character/character-presets";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import {
  defaultDirectorBackgroundId,
  directorPresetBackgrounds,
} from "@/service/director/skill-rules";
import { sceneTextLangLabel } from "@/util/i18n/picker-labels";

const ASPECT_OPTIONS: readonly AspectRatio[] = ["9:16", "16:9", "1:1"];
const VO_LANG_OPTIONS: readonly VoLanguage[] = ["yue", "zh", "en", "ja"];
const SCENE_TEXT_OPTIONS: readonly SceneTextChoice[] = [
  "zh-Hant",
  "zh-Hans",
  "en",
  "none",
];

function characterPreviewForStyle(
  character: PublicCharacter,
  styleId: string,
  selection?: { versionId?: string; presetId?: string },
): string {
  if (selection?.presetId) {
    const preset = (character.presets || []).find(
      (p) => p.id === selection.presetId,
    );
    if (preset) {
      return (
        preset.portraitUrl ||
        preset.profileUrl ||
        preset.blueprintUrl ||
        character.previewUrl ||
        ""
      );
    }
  }
  if (selection?.versionId) {
    const ver = character.versions.find((v) => v.id === selection.versionId);
    if (ver) {
      return (
        ver.portraitUrl ||
        ver.profileUrl ||
        ver.blueprintUrl ||
        character.previewUrl ||
        ""
      );
    }
  }
  const sheet = defaultSheetForStyle(character, styleId);
  return (
    sheet?.portraitUrl ||
    sheet?.profileUrl ||
    sheet?.blueprintUrl ||
    character.previewUrl ||
    ""
  );
}

export function DirectorDockBrief({
  skills,
  skillSlug,
  skillTitle,
  ruleSlug,
  onSkillChange,
  styles,
  styleId,
  styleName,
  onStyleChange,
  characters: initialCharacters,
  characterIds,
  onCharacterIdsChange,
  characterSelections,
  onCharacterSelectionsChange,
  castNeed,
  products,
  productIds,
  onProductIdsChange,
  bookend,
  logoUrl,
  onLogoUrlChange,
  talkingHead,
  talkingHeadBackground,
  talkingHeadPoseId,
  onTalkingHeadPoseChange,
  presetBackgrounds,
  directorBackgroundId,
  onDirectorBackgroundChange,
  allowsBgUpload,
  backgroundImageUrls,
  onBackgroundImageUrlsChange,
  source,
  onSourceChange,
  spokenScript,
  onSpokenScriptChange,
  uploadedVoUrl,
  uploadedVoDurationSeconds,
  onUploadedVoChange,
  referenceImages,
  onReferenceImagesChange,
  clipDrafts,
  onClipDraftsChange,
  language,
  onVoLanguageChange,
  sceneTextLanguage,
  onSceneTextLanguageChange,
  aspectRatio,
  onAspectRatioSelect,
  credits,
  subscribed,
  briefBusy,
  submitting,
  canSubmit,
  error,
  onError,
  onOpenDetails,
  restarting,
  onCancelRestart,
  onSubmitCreateNew,
  creatingNew,
  hasExistingProject,
}: {
  skills: PublicSkill[];
  skillSlug: string;
  skillTitle: string;
  ruleSlug: string;
  onSkillChange: (slug: string) => void;
  styles: PublicStyle[];
  styleId: string;
  styleName: string;
  onStyleChange: (id: string) => void;
  characters: PublicCharacter[];
  characterIds: string[];
  onCharacterIdsChange: (ids: string[]) => void;
  characterSelections: CharacterSelectionMap;
  onCharacterSelectionsChange: (next: CharacterSelectionMap) => void;
  castNeed: number;
  products: PublicProduct[];
  productIds: string[];
  onProductIdsChange: (ids: string[]) => void;
  bookend: boolean;
  logoUrl: string;
  onLogoUrlChange: (url: string) => void;
  talkingHead: boolean;
  talkingHeadBackground: boolean;
  talkingHeadPoseId: TalkingHeadPoseId;
  onTalkingHeadPoseChange: (id: TalkingHeadPoseId) => void;
  presetBackgrounds: ReturnType<typeof directorPresetBackgrounds>;
  directorBackgroundId: string;
  onDirectorBackgroundChange: (id: string) => void;
  allowsBgUpload: boolean;
  backgroundImageUrls: string[];
  onBackgroundImageUrlsChange: Dispatch<SetStateAction<string[]>>;
  source: string;
  onSourceChange: (value: string) => void;
  spokenScript: string;
  onSpokenScriptChange: (value: string) => void;
  uploadedVoUrl?: string;
  uploadedVoDurationSeconds?: number;
  onUploadedVoChange: (next: {
    url?: string;
    durationSeconds?: number;
    transcript?: string;
  }) => void;
  referenceImages: ReferenceImageDraft[];
  onReferenceImagesChange: Dispatch<SetStateAction<ReferenceImageDraft[]>>;
  clipDrafts: StoryboardClipDraft[];
  onClipDraftsChange: (next: StoryboardClipDraft[]) => void;
  language: VoLanguage;
  onVoLanguageChange: (lang: VoLanguage) => void;
  voiceGender?: VoiceGender;
  onVoiceGenderChange?: (gender: VoiceGender) => void;
  dialogueOnly?: boolean;
  speechPace?: SpeechPace;
  onSpeechPaceChange?: (pace: SpeechPace) => void;
  sceneTextLanguage: SceneTextChoice;
  onSceneTextLanguageChange: (choice: SceneTextChoice) => void;
  aspectRatio: AspectRatio | "";
  onAspectRatioSelect: (ratio: AspectRatio) => void;
  durationPreset?: DurationPreset;
  onDurationPresetChange?: (preset: DurationPreset) => void;
  credits: number;
  subscribed: boolean;
  briefBusy: boolean;
  submitting: boolean;
  canSubmit: boolean;
  error: string;
  onError: (msg: string) => void;
  projectPicker?: ReactNode;
  onOpenDetails: () => void;
  onOpenTutorial?: () => void;
  restarting: boolean;
  onCancelRestart: () => void;
  onSubmitCreateNew: () => void;
  creatingNew: boolean;
  hasExistingProject: boolean;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();

  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [charDialogOpen, setCharDialogOpen] = useState(false);
  const [createCharOpen, setCreateCharOpen] = useState(false);
  const [managingCharId, setManagingCharId] = useState<string | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [bgDialogOpen, setBgDialogOpen] = useState(false);
  const [voDialogOpen, setVoDialogOpen] = useState(false);
  const [draftsDialogOpen, setDraftsDialogOpen] = useState(false);
  const [actingNoteOpen, setActingNoteOpen] = useState(false);

  const [createdCharacters, setCreatedCharacters] = useState<PublicCharacter[]>(
    [],
  );
  const [charOverrides, setCharOverrides] = useState<
    Record<string, PublicCharacter>
  >({});

  const allCharacters = useMemo(() => {
    const merged = [...initialCharacters];
    for (const item of createdCharacters) {
      if (!merged.some((existing) => existing.id === item.id)) {
        merged.unshift(item);
      }
    }
    return merged.map((c) => charOverrides[c.id] ?? c);
  }, [initialCharacters, createdCharacters, charOverrides]);

  const readyCharacters = useMemo(
    () =>
      allCharacters.filter((c) => {
        const charStyles = c.styleIds?.length ? c.styleIds : [c.styleId];
        const sheet = defaultSheetForStyle(c, styleId);
        const isSelected = characterIds.includes(c.id);
        return (
          (Boolean(sheet?.blueprintUrl || c.previewUrl) || isSelected) &&
          (!styleId || charStyles.includes(styleId))
        );
      }),
    [allCharacters, styleId, characterIds],
  );

  const castSlots = useMemo(() => {
    const enriched = allCharacters.map((c) => ({
      id: c.id,
      name: c.name,
      previewUrl: characterPreviewForStyle(
        c,
        styleId,
        characterSelections[c.id],
      ),
    }));
    const slotTotal = resolveCastSlotCount(
      talkingHead ? "talking-head" : "explainer",
      castNeed,
    );
    return buildCastSlotItems(characterIds, enriched, slotTotal);
  }, [allCharacters, styleId, characterSelections, characterIds, castNeed, talkingHead]);

  const activeSkill = skills.find((s) => s.slug === skillSlug);
  const activeStyle = styles.find((s) => s.id === styleId);
  const selectedPose = resolveTalkingHeadPose(talkingHeadPoseId);
  const selectedPoseCopy = localizedTalkingHeadPose(selectedPose, locale);

  const activeDirectorBgId =
    directorBackgroundId || defaultDirectorBackgroundId(ruleSlug) || "";
  const activeDirectorBg = presetBackgrounds.find(
    (b) => b.id === activeDirectorBgId,
  );
  const activeBgThumbUrl =
    backgroundImageUrls[0] || activeDirectorBg?.previewUrl || "";

  const firstRefThumbUrl = referenceImages[0]?.url || "";

  function handleSelectMode(nextId: string) {
    if (error) onError("");
    if (nextId === "details") {
      onOpenDetails();
      return;
    }
    if (nextId === "talking-head" && !talkingHead) {
      const thSlug = resolveModeSwitchSkillSlug("talking-head", skills);
      if (thSlug) {
        onSkillChange(thSlug);
      } else {
        router.push("/app/talking-heads");
      }
      return;
    }
    if (nextId === "explainer" && talkingHead) {
      const expSlug = resolveModeSwitchSkillSlug("explainer", skills);
      if (expSlug) {
        onSkillChange(expSlug);
      } else {
        router.push("/app/explainers");
      }
    }
  }

  function stepSkill(delta: 1 | -1) {
    if (skills.length < 2) return;
    const slugs = skills.map((s) => s.slug);
    onSkillChange(cycleOption(slugs, skillSlug, delta));
  }

  function stepPose(delta: 1 | -1) {
    onTalkingHeadPoseChange(
      cycleOption(TALKING_HEAD_POSE_IDS, talkingHeadPoseId, delta),
    );
  }

  function stepScene(delta: 1 | -1) {
    if (presetBackgrounds.length < 2) return;
    const ids = presetBackgrounds.map((b) => b.id);
    onDirectorBackgroundChange(cycleOption(ids, activeDirectorBgId, delta));
  }

  const sceneValueLabel =
    backgroundImageUrls.length > 0
      ? locale === "en"
        ? "Custom Scene"
        : "自訂場景"
      : activeDirectorBg
        ? localizedDirectorBackground(activeDirectorBg, locale).name
        : !talkingHead && firstRefThumbUrl
          ? locale === "en"
            ? `Ref (${referenceImages.length})`
            : `參考圖 (${referenceImages.length})`
          : locale === "en"
            ? "Auto Scene"
            : "預設場景";

  const sceneTextLabel = sceneTextLangLabel(t, sceneTextLanguage).label;

  const generateLabel = submitting
    ? t("brief.submit.submitting")
    : restarting
      ? t("brief.submit.regenerate")
      : hasExistingProject
        ? t("brief.submit.saveAndRegenerateStoryboard")
        : locale === "en"
          ? "Generate"
          : "生成";

  const creditEstimate = talkingHead ? "15/s" : "20";

  return (
    <>
      <DirectorDockStage>
        <DirectorDockHero kind={talkingHead ? "talking-head" : "explainer"} />

        {/* Collapsible Director Panel */}
        <DirectorDockPanel>
          {/* Left Icon 1: Visual Style (on left side of character selection button) */}
          {!talkingHead ? (
            <DirectorDockStyleButton
              tourId="visual-style-card"
              thumbUrl={activeStyle?.previewUrl}
              label={styleName}
              disabled={briefBusy}
              onClick={() => setStyleDialogOpen(true)}
            />
          ) : null}

          {/* Left Icon 2: Cast Avatar Slots */}
          <DirectorDockCastGroup
            tourId="character-card"
            slots={castSlots}
            disabled={briefBusy}
            badgeLabel={t("brief.cast.title")}
            onOpenPicker={() => setCharDialogOpen(true)}
            onManageActive={() => setCharDialogOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell: Video Type (Director Skill) */}
          <DirectorDockStepperCell
            tourId="video-type-card"
            thumbUrl={
              activeSkill?.previewUrl ||
              activeStyle?.previewUrl ||
              "/hero/outputs/explainer.webp"
            }
            label={
              locale === "zh-Hant"
                ? "影片類型"
                : locale === "zh-Hans"
                  ? "视频类型"
                  : "Video Type"
            }
            value={skillTitle}
            disabled={briefBusy}
            onPrev={skills.length > 1 ? () => stepSkill(-1) : undefined}
            onNext={skills.length > 1 ? () => stepSkill(1) : undefined}
            onClick={() => setSkillDialogOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell: Framing Pose (Talking Head only) */}
          {talkingHead ? (
            <DirectorDockStepperCell
              tourId="visual-style-card"
              thumbUrl={selectedPose.previewUrl}
              label={
                locale === "zh-Hant"
                  ? "運鏡取景"
                  : locale === "zh-Hans"
                    ? "运镜取景"
                    : "Framing"
              }
              value={selectedPoseCopy.name}
              disabled={briefBusy}
              onPrev={() => stepPose(-1)}
              onNext={() => stepPose(1)}
              onClick={() => stepPose(1)}
            />
          ) : null}

          <DirectorDockDivider />

          {/* Cell 4: Scene & Background */}
          <DirectorDockStepperCell
            thumbUrl={activeBgThumbUrl || (!talkingHead ? firstRefThumbUrl : "")}
            icon={
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            }
            label={
              locale === "zh-Hant"
                ? "場景背景"
                : locale === "zh-Hans"
                  ? "场景背景"
                  : "Scene"
            }
            value={sceneValueLabel}
            disabled={briefBusy}
            onPrev={presetBackgrounds.length > 1 ? () => stepScene(-1) : undefined}
            onNext={presetBackgrounds.length > 1 ? () => stepScene(1) : undefined}
            onClick={() => {
              if (talkingHead || presetBackgrounds.length > 0 || allowsBgUpload) {
                setBgDialogOpen(true);
              } else {
                setRefDialogOpen(true);
              }
            }}
          />

          {/* Optional Talking Head Acting Direction */}
          {talkingHead ? (
            <DirectorDockDurationCell
              label={
                locale === "zh-Hant"
                  ? "導演演技"
                  : locale === "zh-Hans"
                    ? "导演演技"
                    : "Direction"
              }
              value={
                uploadedVoDurationSeconds
                  ? `${Math.round(uploadedVoDurationSeconds)}s VO`
                  : locale === "en"
                    ? "Natural"
                    : "自然親切"
              }
              disabled={briefBusy}
              onClick={() => setActingNoteOpen(true)}
            />
          ) : null}
        </DirectorDockPanel>

        {/* Main Composer Box + Left Floating Mode Rail */}
        <DirectorDockComposer
          tourId="instruction-card"
          disabled={briefBusy}
          modeItems={[
            {
              id: "explainer",
              label:
                locale === "zh-Hant"
                  ? "解說"
                  : locale === "zh-Hans"
                    ? "解说"
                    : "Explain",
              icon: (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              ),
            },
            {
              id: "talking-head",
              label:
                locale === "zh-Hant"
                  ? "開講"
                  : locale === "zh-Hans"
                    ? "开讲"
                    : "Speak",
              icon: (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="5" width="14" height="14" rx="2" />
                  <path d="m22 7-6 5 6 5V7Z" />
                </svg>
              ),
            },
          ]}
          activeModeId={talkingHead ? "talking-head" : "explainer"}
          onSelectMode={handleSelectMode}
          promptValue={talkingHead ? spokenScript : source}
          onPromptChange={(val) => {
            if (talkingHead) {
              onSpokenScriptChange(val);
            } else {
              onSourceChange(val);
            }
            if (error) onError("");
          }}
          promptPlaceholder={
            talkingHead
              ? locale === "zh-Hant"
                ? "輸入角色要朗讀的講稿，或點下方「配音」上傳／錄製音訊..."
                : locale === "zh-Hans"
                  ? "输入角色要朗读的讲稿，或点下方“配音”上传／录制音频..."
                  : "Enter the script for your character to read, or attach custom voice audio below..."
              : locale === "zh-Hant"
                ? "描述你的場景、貼上主題或文章，使用上方導演面板設定角色、風格與場景..."
                : locale === "zh-Hans"
                  ? "描述你的场景、贴上主题或文章，使用上方导演面板设置角色、风格与场景..."
                  : "Describe your topic or paste your script, and configure characters, style & scene above..."
          }
          topMediaSlot={
            uploadedVoUrl && talkingHead ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs text-[#12141c]">
                <span className="inline-flex items-center gap-1.5 truncate font-semibold">
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  <span>
                    {locale === "en"
                      ? "Custom voiceover audio attached"
                      : "已附加自訂配音音訊"}
                    {uploadedVoDurationSeconds
                      ? ` (${Math.round(uploadedVoDurationSeconds)}s)`
                      : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onUploadedVoChange({ url: undefined, durationSeconds: undefined })}
                  className="cursor-pointer rounded-xl px-2 py-0.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-200 hover:text-[#12141c]"
                >
                  {locale === "en" ? "Clear" : "移除"}
                </button>
              </div>
            ) : null
          }
          plusMenuOpen={plusMenuOpen}
          onPlusToggle={() => setPlusMenuOpen((prev) => !prev)}
          plusMenuSlot={
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-zinc-400">
                  {locale === "en" ? "Sample Scripts" : "一鍵填入範例腳本"}
                </p>
                <div className="rounded-2xl bg-white p-2 text-[#12141c]">
                  <SampleScriptBar
                    disabled={briefBusy}
                    talkingHead={talkingHead}
                    onApply={({ source: nextSource, spokenScript: nextSpoken }) => {
                      onSourceChange(nextSource);
                      if (nextSpoken !== undefined) {
                        onSpokenScriptChange(nextSpoken);
                      }
                      setPlusMenuOpen(false);
                    }}
                  />
                </div>
              </div>

              {products.length > 0 && !talkingHead ? (
                <div className="border-t border-white/10 pt-2.5">
                  <p className="mb-1.5 text-[11px] font-bold text-zinc-400">
                    {t("brief.products.title")}
                  </p>
                  <div className="rounded-2xl bg-white p-2 text-[#12141c]">
                    <ProductDropdown
                      products={products}
                      value={productIds}
                      onChange={onProductIdsChange}
                      disabled={briefBusy}
                    />
                  </div>
                </div>
              ) : null}

              {bookend ? (
                <div className="border-t border-white/10 pt-2.5">
                  <p className="mb-1.5 text-[11px] font-bold text-zinc-400">
                    {t("brief.logo.title")}
                  </p>
                  <div className="rounded-2xl bg-white p-2 text-[#12141c]">
                    <LogoPicker
                      value={logoUrl}
                      onChange={onLogoUrlChange}
                      onError={onError}
                      disabled={briefBusy}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          }
          pills={
            <>
              <DirectorDockPill
                icon={
                  <span className="inline-block h-3 w-2 rounded-[2px] border border-current" />
                }
                label={aspectRatio || "9:16"}
                disabled={briefBusy}
                onClick={() =>
                  onAspectRatioSelect(
                    cycleOption(ASPECT_OPTIONS, (aspectRatio || "9:16") as AspectRatio, 1),
                  )
                }
              />

              <DirectorDockPill
                icon={
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                }
                label={LANGUAGE_PRESETS[language].label}
                disabled={briefBusy}
                onClick={() =>
                  onVoLanguageChange(cycleOption(VO_LANG_OPTIONS, language, 1))
                }
              />

              <DirectorDockPill
                icon={
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
                  </svg>
                }
                label={
                  locale === "en"
                    ? `Text: ${sceneTextLabel}`
                    : `字卡: ${sceneTextLabel}`
                }
                disabled={briefBusy}
                onClick={() =>
                  onSceneTextLanguageChange(
                    cycleOption(SCENE_TEXT_OPTIONS, sceneTextLanguage, 1),
                  )
                }
              />

              {talkingHead ? (
                <DirectorDockPill
                  icon={
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  }
                  label={
                    uploadedVoUrl
                      ? locale === "en"
                        ? "Audio Ready"
                        : "配音已附"
                      : locale === "en"
                        ? "Voice Audio"
                        : "自訂配音"
                  }
                  disabled={briefBusy}
                  onClick={() => setVoDialogOpen(true)}
                />
              ) : (
                <>
                  <DirectorDockPill
                    icon={
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    }
                    label={
                      referenceImages.length > 0
                        ? locale === "en"
                          ? `Ref (${referenceImages.length})`
                          : `參考圖 (${referenceImages.length})`
                        : locale === "en"
                          ? "Reference"
                          : "參考圖"
                    }
                    disabled={briefBusy}
                    onClick={() => setRefDialogOpen(true)}
                  />
                  <DirectorDockPill
                    icon={
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    }
                    label={
                      locale === "en"
                        ? `Sketch ${clipDrafts.length}/4`
                        : `分鏡草稿 ${clipDrafts.length}/4`
                    }
                    hasChevron
                    disabled={briefBusy}
                    title={
                      locale === "en"
                        ? "Storyboard Sketch Pad"
                        : "手繪分鏡草稿"
                    }
                    onClick={() => setDraftsDialogOpen(true)}
                  />
                </>
              )}
            </>
          }
          generateType="submit"
          generateDisabled={!canSubmit}
          generating={submitting}
          generateLabel={generateLabel}
          creditBadge={creditEstimate}
          error={error}
          footerNotice={
            restarting || (castNeed > 0 && characterIds.length !== castNeed) ? (
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <span>
                  {castNeed > 0 && characterIds.length !== castNeed
                    ? t("brief.footer.castRequired", { n: castNeed })
                    : restarting
                      ? t("brief.footer.restartWarning")
                      : null}
                </span>
                {restarting ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onCancelRestart}
                      className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-zinc-300 hover:text-white"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      disabled={!canSubmit || creatingNew}
                      onClick={onSubmitCreateNew}
                      className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                    >
                      {creatingNew
                        ? t("brief.submit.submitting")
                        : t("brief.submit.createNew")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : undefined
          }
        />
      </DirectorDockStage>

      {/* Modals & Pickers (Reusing existing studio dialogs) */}
      {skillDialogOpen ? (
        <SkillSelectDialog
          skills={skills}
          value={skillSlug}
          onChange={(slug) => {
            onSkillChange(slug);
            setSkillDialogOpen(false);
          }}
          onClose={() => setSkillDialogOpen(false)}
        />
      ) : null}

      {styleDialogOpen ? (
        <StyleSelectDialog
          styles={styles}
          selectedIds={[styleId]}
          maxSelect={1}
          isMulti={false}
          onPick={(id: string) => {
            onStyleChange(id);
            setStyleDialogOpen(false);
          }}
          onClose={() => setStyleDialogOpen(false)}
        />
      ) : null}

      {charDialogOpen ? (
        <CharacterSelectDialog
          characters={allCharacters}
          styles={styles}
          styleId={styleId}
          value={characterIds}
          selections={characterSelections}
          max={castNeed > 0 ? castNeed : 1}
          required={castNeed}
          credits={credits}
          subscribed={subscribed}
          onChange={onCharacterIdsChange}
          onSelectionsChange={onCharacterSelectionsChange}
          onCharacterUpdated={(updated) =>
            setCharOverrides((prev) => ({ ...prev, [updated.id]: updated }))
          }
          onCharacterCreated={(created) => {
            setCreatedCharacters((prev) => [created, ...prev]);
            setCharOverrides((prev) => ({ ...prev, [created.id]: created }));
          }}
          onClose={() => setCharDialogOpen(false)}
        />
      ) : null}

      {createCharOpen ? (
        <InlineCreateCharacterDialog
          styles={styles}
          defaultStyleId={styleId}
          credits={credits}
          subscribed={subscribed}
          onCreated={(created) => {
            setCreatedCharacters((prev) => [created, ...prev]);
            setCharOverrides((prev) => ({ ...prev, [created.id]: created }));
            if (styleId && created.styleId && created.styleId !== styleId) {
              onStyleChange(created.styleId);
            }
            const maxCast = castNeed > 0 ? castNeed : 1;
            if (maxCast <= 1) {
              onCharacterIdsChange([created.id]);
            } else {
              const nextIds = characterIds.includes(created.id)
                ? characterIds
                : characterIds.length < maxCast
                  ? [...characterIds, created.id]
                  : [...characterIds.slice(0, maxCast - 1), created.id];
              onCharacterIdsChange(nextIds);
            }
          }}
          onClose={() => setCreateCharOpen(false)}
        />
      ) : null}

      {managingCharId && readyCharacters.length > 0 ? (
        <CharacterManageDialog
          character={
            readyCharacters.find((c) => c.id === managingCharId) ||
            readyCharacters[0]!
          }
          styleId={styleId}
          initialSelection={characterSelections[managingCharId]}
          onCharacterUpdated={(updated) =>
            setCharOverrides((prev) => ({ ...prev, [updated.id]: updated }))
          }
          onSelectAndClose={(option) => {
            const targetId = managingCharId;
            setManagingCharId(null);
            onCharacterSelectionsChange({
              ...characterSelections,
              [targetId]: option,
            });
          }}
          onClose={() => setManagingCharId(null)}
        />
      ) : null}

      {/* Reference Images Dialog */}
      {refDialogOpen ? (
        <DialogBackdrop
          className="flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setRefDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {t("brief.references.title")}
              </h3>
              <button
                type="button"
                onClick={() => setRefDialogOpen(false)}
                className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <ReferenceImagesField
              value={referenceImages}
              onChange={onReferenceImagesChange}
              onError={onError}
              disabled={briefBusy}
              hideHeader
            />
          </div>
        </DialogBackdrop>
      ) : null}

      {/* Background Selection / Upload Dialog */}
      {bgDialogOpen ? (
        <DialogBackdrop
          className="flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setBgDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl space-y-4 rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {locale === "en" ? "Scene & Background" : "場景與背景設定"}
              </h3>
              <button
                type="button"
                onClick={() => setBgDialogOpen(false)}
                className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            {presetBackgrounds.length > 0 ? (
              <DirectorBackgroundPicker
                presets={presetBackgrounds}
                selectedId={activeDirectorBgId}
                customUrls={backgroundImageUrls}
                allowsUpload={allowsBgUpload}
                open={false}
                disabled={briefBusy}
                onOpenChange={() => {}}
                onSelectPreset={(id) => {
                  onDirectorBackgroundChange(id);
                  setBgDialogOpen(false);
                }}
                onChangeCustomUrls={onBackgroundImageUrlsChange}
                onError={onError}
              />
            ) : null}
            {talkingHeadBackground ? (
              <TalkingHeadBackgroundField
                value={backgroundImageUrls}
                onChange={onBackgroundImageUrlsChange}
                onError={onError}
                disabled={briefBusy}
              />
            ) : null}
          </div>
        </DialogBackdrop>
      ) : null}

      {/* Talking Head VO Upload / Record Dialog */}
      {voDialogOpen ? (
        <DialogBackdrop
          className="flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setVoDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl space-y-4 rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {t("brief.talkingHead.scriptTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setVoDialogOpen(false)}
                className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <TalkingHeadScriptField
              value={spokenScript}
              onChange={onSpokenScriptChange}
              language={language}
              uploadedVoUrl={uploadedVoUrl}
              uploadedVoDurationSeconds={uploadedVoDurationSeconds}
              onUploadedVoChange={onUploadedVoChange}
              onError={onError}
              disabled={briefBusy}
            />
          </div>
        </DialogBackdrop>
      ) : null}

      {/* Talking Head Acting Instruction Dialog */}
      {actingNoteOpen ? (
        <DialogBackdrop
          className="flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setActingNoteOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl space-y-3 rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {t("brief.talkingHead.instructionTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setActingNoteOpen(false)}
                className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted">
              {t("brief.talkingHead.instructionHint")}
            </p>
            <textarea
              rows={5}
              value={source}
              onChange={(e) => onSourceChange(e.target.value)}
              disabled={briefBusy}
              placeholder={t("brief.talkingHead.instructionPlaceholder")}
              className="w-full rounded-xl border border-accent-ink/20 bg-paper p-3 text-sm leading-6"
            />
          </div>
        </DialogBackdrop>
      ) : null}

      {/* Storyboard Drafts Modal */}
      {draftsDialogOpen ? (
        <DialogBackdrop
          className="flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setDraftsDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {locale === "en" ? "Storyboard Drafts" : "手繪分鏡草稿"}
              </h3>
              <button
                type="button"
                onClick={() => setDraftsDialogOpen(false)}
                className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <StoryboardDraftsStep
              skillSlug={skillSlug}
              styleId={styleId}
              source={source}
              spokenScript={talkingHead ? spokenScript : undefined}
              language={language}
              aspectRatio={aspectRatio || "16:9"}
              drafts={clipDrafts}
              disabled={briefBusy}
              onChange={onClipDraftsChange}
            />
          </div>
        </DialogBackdrop>
      ) : null}
    </>
  );
}
