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
  DirectorDockCurveCell,
  DirectorDockDivider,
  DirectorDockDurationCell,
  DirectorDockHero,
  DirectorDockPanel,
  DirectorDockPill,
  DirectorDockQuickTile,
  DirectorDockStage,
  DirectorDockStepperCell,
} from "@/presentation/components/app/director-dock";
import { CharacterManageDialog } from "@/presentation/components/app/projects/[id]/character-manage-dialog";
import {
  CharacterSelectDialog,
  defaultSheetForStyle,
} from "@/presentation/components/app/projects/[id]/character-select-dialog";
import { InlineCreateCharacterDialog } from "@/presentation/components/app/projects/[id]/inline-create-character-dialog";
import { SkillSelectDialog } from "@/presentation/components/app/projects/[id]/skill-select-dialog";
import { DirectorBackgroundPicker } from "@/presentation/components/app/projects/new/director-background-picker";
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
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import { VOICE_PRESETS } from "@/service/director/voice";
import {
  durationPresetLabel,
  sceneTextLangLabel,
  speechPaceLabel,
} from "@/util/i18n/picker-labels";

const ASPECT_OPTIONS: readonly AspectRatio[] = ["9:16", "16:9", "1:1"];
const DURATION_OPTIONS: readonly DurationPreset[] = [
  "auto",
  "micro",
  "short",
  "punchy",
  "full",
];
const VO_LANG_OPTIONS: readonly VoLanguage[] = ["yue", "zh", "en", "ja"];
const PACE_OPTIONS: readonly SpeechPace[] = ["slow", "medium", "fast"];
const VOICE_GENDER_OPTIONS: readonly VoiceGender[] = ["female", "male"];
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
  voiceGender,
  onVoiceGenderChange,
  dialogueOnly,
  speechPace,
  onSpeechPaceChange,
  sceneTextLanguage,
  onSceneTextLanguageChange,
  aspectRatio,
  onAspectRatioSelect,
  durationPreset,
  onDurationPresetChange,
  credits,
  subscribed,
  briefBusy,
  submitting,
  canSubmit,
  error,
  onError,
  projectPicker,
  onOpenDetails,
  onOpenTutorial,
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
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  dialogueOnly: boolean;
  speechPace: SpeechPace;
  onSpeechPaceChange: (pace: SpeechPace) => void;
  sceneTextLanguage: SceneTextChoice;
  onSceneTextLanguageChange: (choice: SceneTextChoice) => void;
  aspectRatio: AspectRatio | "";
  onAspectRatioSelect: (ratio: AspectRatio) => void;
  durationPreset: DurationPreset;
  onDurationPresetChange: (preset: DurationPreset) => void;
  credits: number;
  subscribed: boolean;
  briefBusy: boolean;
  submitting: boolean;
  canSubmit: boolean;
  error: string;
  onError: (msg: string) => void;
  projectPicker?: ReactNode;
  onOpenDetails: () => void;
  onOpenTutorial: () => void;
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
    const slotTotal = Math.max(castNeed > 0 ? castNeed : 2, 2);
    return buildCastSlotItems(characterIds, enriched, slotTotal);
  }, [allCharacters, styleId, characterSelections, characterIds, castNeed]);

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
    if (nextId === "details") {
      onOpenDetails();
      return;
    }
    if (nextId === "talking-head" && !talkingHead) {
      const thSkill = skills.find((s) => isTalkingHeadSkill(s.slug));
      if (thSkill) {
        onSkillChange(thSkill.slug);
      } else {
        router.push("/app/talking-heads");
      }
      return;
    }
    if (nextId === "explainer" && talkingHead) {
      const expSkill = skills.find((s) => !isTalkingHeadSkill(s.slug));
      if (expSkill) {
        onSkillChange(expSkill.slug);
      } else {
        router.push("/app/explainers");
      }
    }
  }

  function stepStyle(delta: 1 | -1) {
    if (styles.length < 2) return;
    const ids = styles.map((s) => s.id);
    onStyleChange(cycleOption(ids, styleId, delta));
  }

  function stepPose(delta: 1 | -1) {
    onTalkingHeadPoseChange(
      cycleOption(TALKING_HEAD_POSE_IDS, talkingHeadPoseId, delta),
    );
  }

  const paceLabel = speechPaceLabel(t, speechPace).label;
  const voiceLabel = dialogueOnly
    ? paceLabel
    : `${VOICE_PRESETS[voiceGender].label} · ${paceLabel}`;
  const durationLabel = durationPresetLabel(t, durationPreset).label;
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

  const creditEstimate = talkingHead ? "15/s" : durationPreset === "auto" ? "20" : durationPreset;

  return (
    <>
      <DirectorDockStage
        topLeft={
          <div
            data-tour-id="setup-mode-bar"
            className="flex flex-wrap items-center gap-2"
          >
            {projectPicker ? (
              <div className="rounded-full bg-white/95 px-1 py-0.5 text-[#12141c] shadow-sm">
                {projectPicker}
              </div>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-zinc-300">
              {talkingHead
                ? locale === "en"
                  ? "Talking Head Studio"
                  : "真人開講工作台"
                : locale === "en"
                  ? "Explainer Studio"
                  : "解說影片工作台"}
            </span>
          </div>
        }
        topRight={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTutorial}
              title={
                locale === "zh-Hant"
                  ? "查看操作教學導覽"
                  : locale === "zh-Hans"
                    ? "查看操作教学导览"
                    : "Show guided tour"
              }
              className="director-dock-cell inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-xs font-bold text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              ?
            </button>
            <button
              type="button"
              disabled={briefBusy}
              onClick={onOpenDetails}
              className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-xs font-bold text-zinc-200 transition hover:border-[#d8ff3e]/60 hover:text-white disabled:opacity-50"
            >
              <span>⚙</span>
              <span>
                {locale === "zh-Hant"
                  ? "完整 4 步設定"
                  : locale === "zh-Hans"
                    ? "完整 4 步设置"
                    : "Full 4-Step Setup"}
              </span>
            </button>
          </div>
        }
      >
        <DirectorDockHero kind={talkingHead ? "talking-head" : "explainer"} />

        {/* Collapsible 🎬 導演面板 (Director Panel) */}
        <DirectorDockPanel
          headerRight={
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={briefBusy}
                onClick={() => setCreateCharOpen(true)}
                className="director-dock-cell cursor-pointer rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-semibold text-[#d8ff3e] transition hover:border-[#d8ff3e]/50 hover:bg-white/10"
              >
                {locale === "en" ? "+ New Character" : "+ 新增角色"}
              </button>
            </div>
          }
        >
          {/* Cell 1: Cast Avatar Slots */}
          <DirectorDockCastGroup
            tourId="character-card"
            slots={castSlots}
            disabled={briefBusy}
            badgeLabel={t("brief.cast.title")}
            onOpenPicker={() => setCharDialogOpen(true)}
            onManageActive={() => setCharDialogOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 2: Visual Style (Explainer) or Framing Pose (Talking Head) */}
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
          ) : (
            <DirectorDockStepperCell
              tourId="visual-style-card"
              thumbUrl={activeStyle?.previewUrl}
              label={
                locale === "zh-Hant"
                  ? "視覺風格"
                  : locale === "zh-Hans"
                    ? "视觉风格"
                    : "Visual Style"
              }
              value={styleName}
              disabled={briefBusy}
              onPrev={() => stepStyle(-1)}
              onNext={() => stepStyle(1)}
              onClick={() => setStyleDialogOpen(true)}
            />
          )}

          <DirectorDockDivider />

          {/* Cell 3: Speech Pace & Voice Curve */}
          <DirectorDockCurveCell
            label={
              locale === "zh-Hant"
                ? "變速與聲線"
                : locale === "zh-Hans"
                  ? "变速与声线"
                  : "Pace & Voice"
            }
            value={voiceLabel}
            disabled={briefBusy}
            onPrev={() =>
              onSpeechPaceChange(cycleOption(PACE_OPTIONS, speechPace, -1))
            }
            onNext={() =>
              onSpeechPaceChange(cycleOption(PACE_OPTIONS, speechPace, 1))
            }
            onClick={() => {
              if (!dialogueOnly) {
                onVoiceGenderChange(
                  cycleOption(VOICE_GENDER_OPTIONS, voiceGender, 1),
                );
              } else {
                onSpeechPaceChange(cycleOption(PACE_OPTIONS, speechPace, 1));
              }
            }}
          />

          <DirectorDockDivider />

          {/* Cell 4: Duration (Explainer) or Acting Note (Talking Head) */}
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
          ) : (
            <DirectorDockDurationCell
              label={
                locale === "zh-Hant"
                  ? "時長"
                  : locale === "zh-Hans"
                    ? "时长"
                    : "Duration"
              }
              value={durationLabel}
              disabled={briefBusy}
              onClick={() =>
                onDurationPresetChange(
                  cycleOption(DURATION_OPTIONS, durationPreset, 1),
                )
              }
            />
          )}
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
                ? "輸入角色要朗讀的講稿，或點右側「配音」上傳／錄製音訊..."
                : locale === "zh-Hans"
                  ? "输入角色要朗读的讲稿，或点右侧“配音”上传／录制音频..."
                  : "Enter the script for your character to read, or attach voice audio on the right..."
              : locale === "zh-Hant"
                ? "描述你的場景、貼上主題或文章，使用上方導演面板加入角色與風格..."
                : locale === "zh-Hans"
                  ? "描述你的场景、贴上主题或文章，使用上方导演面板添加角色和风格..."
                  : "Describe your topic or paste your script, and pick characters & style above..."
          }
          topMediaSlot={
            uploadedVoUrl && talkingHead ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 px-3 py-1.5 text-xs text-zinc-100">
                <span className="truncate font-semibold text-[#d8ff3e]">
                  🎙{" "}
                  {locale === "en"
                    ? "Custom voiceover audio attached"
                    : "已附加自訂配音音訊"}
                  {uploadedVoDurationSeconds
                    ? ` (${Math.round(uploadedVoDurationSeconds)}s)`
                    : ""}
                </span>
                <button
                  type="button"
                  onClick={() => onUploadedVoChange({ url: undefined, durationSeconds: undefined })}
                  className="cursor-pointer rounded px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-white/10 hover:text-white"
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
                <div className="rounded-xl bg-white p-2 text-[#12141c]">
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
                  <div className="rounded-xl bg-white p-2 text-[#12141c]">
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
                  <div className="rounded-xl bg-white p-2 text-[#12141c]">
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
                tourId="video-type-card"
                accentBadge={<span>〰</span>}
                label={skillTitle}
                hasChevron
                disabled={briefBusy}
                onClick={() => setSkillDialogOpen(true)}
              />

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
                icon={<span>🌐</span>}
                label={LANGUAGE_PRESETS[language].label}
                disabled={briefBusy}
                onClick={() =>
                  onVoLanguageChange(cycleOption(VO_LANG_OPTIONS, language, 1))
                }
              />

              <DirectorDockPill
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

              {!talkingHead ? (
                <DirectorDockPill
                  label={`- ${clipDrafts.length}/4 +`}
                  hasChevron
                  disabled={briefBusy}
                  title={
                    locale === "en"
                      ? "Storyboard Sketch Pad"
                      : "手繪分鏡草稿"
                  }
                  onClick={() => setDraftsDialogOpen(true)}
                />
              ) : null}
            </>
          }
          rightSlot1={
            talkingHead ? (
              <DirectorDockQuickTile
                label={
                  locale === "zh-Hant"
                    ? "背景"
                    : locale === "zh-Hans"
                      ? "背景"
                      : "Scene"
                }
                badge={locale === "en" ? "Opt" : "可選"}
                thumbUrl={activeBgThumbUrl}
                disabled={briefBusy}
                onClick={() => setBgDialogOpen(true)}
                onClear={
                  backgroundImageUrls.length > 0
                    ? () => onBackgroundImageUrlsChange([])
                    : undefined
                }
              />
            ) : (
              <DirectorDockQuickTile
                label={
                  locale === "zh-Hant"
                    ? "風格"
                    : locale === "zh-Hans"
                      ? "风格"
                      : "Style"
                }
                thumbUrl={activeStyle?.previewUrl}
                disabled={briefBusy}
                onClick={() => setStyleDialogOpen(true)}
              />
            )
          }
          rightSlot2={
            talkingHead ? (
              <DirectorDockQuickTile
                label={
                  locale === "zh-Hant"
                    ? "配音"
                    : locale === "zh-Hans"
                      ? "配音"
                      : "Audio"
                }
                badge={
                  uploadedVoUrl
                    ? locale === "en"
                      ? "Ready"
                      : "已附"
                    : locale === "en"
                      ? "Opt"
                      : "可選"
                }
                active={Boolean(uploadedVoUrl)}
                icon={uploadedVoUrl ? "🎙" : "+"}
                disabled={briefBusy}
                onClick={() => setVoDialogOpen(true)}
                onClear={
                  uploadedVoUrl
                    ? () =>
                        onUploadedVoChange({
                          url: undefined,
                          durationSeconds: undefined,
                        })
                    : undefined
                }
              />
            ) : (
              <DirectorDockQuickTile
                label={
                  presetBackgrounds.length > 0 && !firstRefThumbUrl
                    ? locale === "en"
                      ? "Scene"
                      : "場景"
                    : locale === "zh-Hant"
                      ? "參考圖"
                      : locale === "zh-Hans"
                        ? "参考图"
                        : "Ref"
                }
                badge={locale === "en" ? "Opt" : "可選"}
                thumbUrl={firstRefThumbUrl || activeBgThumbUrl}
                disabled={briefBusy}
                onClick={() =>
                  presetBackgrounds.length > 0 && !firstRefThumbUrl
                    ? setBgDialogOpen(true)
                    : setRefDialogOpen(true)
                }
                onClear={
                  firstRefThumbUrl
                    ? () => onReferenceImagesChange([])
                    : undefined
                }
              />
            )
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
          characters={readyCharacters}
          styleId={styleId}
          value={characterIds}
          selections={characterSelections}
          max={castNeed > 0 ? castNeed : 1}
          required={castNeed}
          onChange={onCharacterIdsChange}
          onSelectionsChange={onCharacterSelectionsChange}
          onCharacterUpdated={(updated) =>
            setCharOverrides((prev) => ({ ...prev, [updated.id]: updated }))
          }
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
