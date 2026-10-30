import type { IDirector, IDirectorBehavior } from "@/model/director";
import { PERFORMANCE_KEYS } from "@/model/director-performance";
import { PROFILE_KEYS } from "@/model/director-profile";
import type { HiggsfieldDefaults, SkillInputSchema, SkillReference } from "@/model/skill";
import { DIRECTORS } from "@/service/director/catalog";
import { explainerCanvasKind, isDiagramExplainerSkill } from "@/service/director/explainer-family";
import { STORYBOARD_MODEL, STORYBOARD_THINKING_LEVEL } from "@/service/director/model";
import { resolvePerformance } from "@/service/director/performance";
import { PROFILE_LABELS_EN } from "@/service/director/profile";
import {
  bookendDirectorBlock,
  cartoonExplainerDirectorBlock,
  cartoonNarratorFrameLock,
  cartoonNarratorVideoLock,
  comparisonCardDirectorBlock,
  DIALOGUE_QA_SKILL_SLUG,
  dialogueOnlyDirectorBlock,
  dialogueQaDirectorBlock,
  editorialInterviewDirectorBlock,
  followShotDirectorBlock,
  isBookendSkill,
  isComparisonCardSkill,
  isEditorialInterviewSkill,
  isFollowShotSkill,
  isOutfitChangeSkill,
  isOutfitReelSkill,
  isStreetLookbookSkill,
  isStyleSwitchSkill,
  isSurpriseInterviewSkill,
  isTalkingBrollSkill,
  isWorkflowPromoSkill,
  listicleDirectorBlock,
  outfitChangeDirectorBlock,
  outfitReelDirectorBlock,
  skillBansNarration,
  skillForcesSceneText,
  STORY_SHORT_SKILL_SLUG,
  storyShortCameraLock,
  storyShortDirectorBlock,
  streetLookbookDirectorBlock,
  styleSwitchDirectorBlock,
  surpriseInterviewDirectorBlock,
  talkingBrollDirectorBlock,
  workflowPromoDirectorBlock,
} from "@/service/director/skill-rules";
import {
  isTalkingHeadSkill,
  talkingHeadDirectorBlock,
  talkingHeadDurationHint,
} from "@/service/director/talking-head";
import { talkingShotForSkill } from "@/service/director/talking-performance";

export type DirectorTextBlock = {
  title: string;
  note?: string;
  text: string;
};

export type DirectorFieldRow = {
  key: string;
  label: string;
  value: string;
};

export type HardcodedDirectorDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  suggestedUseCase: string;
  sortOrder: number;
  isActive: boolean;
  hiddenInPicker: boolean;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
  behavior: DirectorFieldRow[];
  inputSchema: SkillInputSchema;
  higgsfieldDefaults: HiggsfieldDefaults;
  profile: DirectorFieldRow[];
  performance: Array<{ language: "en" | "yue"; label: string; slots: DirectorFieldRow[] }>;
  systemPrompt: string;
  references: SkillReference[];
  phaseAPrompt: string;
  phaseBPrompt: string;
  runtimeBlocks: DirectorTextBlock[];
};

export type HardcodedDirectorCatalog = {
  storyboardModel: string;
  storyboardThinking: string;
  directors: HardcodedDirectorDetail[];
};

const BEHAVIOR_ROWS: Array<{ key: keyof IDirectorBehavior; label: string }> = [
  { key: "keyframeMode", label: "關鍵幀模式" },
  { key: "chainsClipStarts", label: "下一段接上一段結尾" },
  { key: "anchorsFramesToFirstClip", label: "畫面錨定第一段" },
  { key: "dualBeat", label: "雙拍（開始／結束）" },
  { key: "maxBackgroundSets", label: "背景板上限" },
  { key: "speechMode", label: "說話方式" },
  { key: "bansNarration", label: "禁止旁白" },
  { key: "requiredCastCount", label: "需要角色數" },
  { key: "talkingHeadShot", label: "口播景別" },
  { key: "selfShotCreatorCamera", label: "自拍創作者鏡頭" },
  { key: "forcesSceneText", label: "強制畫面文字" },
  { key: "allowsInWorldLabels", label: "允許畫面內標籤" },
  { key: "attachesTextStyleReference", label: "附上文字風格參考" },
  { key: "maxStyleCount", label: "可選風格數" },
  { key: "bookendRole", label: "片頭／片尾" },
  { key: "requiresSpokenScript", label: "需要口播稿" },
  { key: "allowsRoomBackgroundUpload", label: "可上傳房間背景" },
  { key: "allowsOpeningPhotoUpload", label: "可上傳開場照片" },
  { key: "allowsBrandLogoUpload", label: "可上傳品牌 logo" },
  { key: "hiddenInPicker", label: "不在選擇器顯示" },
  { key: "audioFirstLipSync", label: "先出聲音再對嘴" },
  { key: "wardrobeBuild", label: "服裝參考鎖定" },
];

const SAMPLE_NOTE = "樣本條件，真正生成時會按那支影片的角色、畫風和比例再變。";

function formatSetting(value: unknown): string {
  if (value === undefined || value === null || value === "") return "未設定";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function behaviorRows(behavior: IDirectorBehavior): DirectorFieldRow[] {
  return BEHAVIOR_ROWS.map((row) => ({
    key: row.key,
    label: row.label,
    value: formatSetting(behavior[row.key]),
  }));
}

function isPhaseBRef(ref: SkillReference) {
  return ref.path.endsWith("prompt-contract.md");
}

function isExampleRef(ref: SkillReference) {
  return ref.path.endsWith("examples.md");
}

function joinPrompt(systemPrompt: string, refs: SkillReference[]) {
  const extras = refs.map((ref) => `\n\n# ${ref.path}\n\n${ref.content}`).join("");
  return `${systemPrompt}${extras}`;
}

function pushBlock(blocks: DirectorTextBlock[], title: string, text: string, note?: string) {
  const body = text.trim();
  if (!body) return;
  blocks.push({ title, text: body, note });
}

function runtimeBlocks(director: IDirector): DirectorTextBlock[] {
  const slug = director.slug;
  const blocks: DirectorTextBlock[] = [];
  if (skillBansNarration(slug)) {
    pushBlock(blocks, "無旁白對話", dialogueOnlyDirectorBlock());
  }
  if (slug === STORY_SHORT_SKILL_SLUG) {
    pushBlock(blocks, "短片規則", storyShortDirectorBlock());
    pushBlock(blocks, "短片鏡頭鎖定", storyShortCameraLock(slug));
  }
  if (isDiagramExplainerSkill(slug)) {
    const canvas = explainerCanvasKind(slug) ?? "whiteboard";
    pushBlock(
      blocks,
      "圖解規則（有角色）",
      cartoonExplainerDirectorBlock({
        hasCharacter: true,
        canvas,
        realistic: false,
        smoothMotion: true,
      }),
      SAMPLE_NOTE,
    );
    pushBlock(
      blocks,
      "圖解規則（無角色）",
      cartoonExplainerDirectorBlock({
        hasCharacter: false,
        canvas,
        realistic: false,
        smoothMotion: true,
      }),
      SAMPLE_NOTE,
    );
    pushBlock(
      blocks,
      "靜幀鎖定（有角色，Clip 1 開頭）",
      cartoonNarratorFrameLock(slug, { hasCharacter: true, clipNumber: 1, position: "start", steadyStills: true }),
      SAMPLE_NOTE,
    );
    pushBlock(
      blocks,
      "靜幀鎖定（無角色，Clip 1）",
      cartoonNarratorFrameLock(slug, { hasCharacter: false, clipNumber: 1, steadyStills: true }),
      SAMPLE_NOTE,
    );
    pushBlock(
      blocks,
      "影片鎖定（有角色，Clip 1）",
      cartoonNarratorVideoLock(slug, { hasCharacter: true, clipNumber: 1, smoothMotion: true }),
      SAMPLE_NOTE,
    );
    pushBlock(
      blocks,
      "影片鎖定（無角色，Clip 1）",
      cartoonNarratorVideoLock(slug, { hasCharacter: false, clipNumber: 1, smoothMotion: true }),
      SAMPLE_NOTE,
    );
  }
  if (slug === DIALOGUE_QA_SKILL_SLUG) {
    pushBlock(blocks, "雙人問答", dialogueQaDirectorBlock());
  }
  if (skillForcesSceneText(slug)) {
    pushBlock(blocks, "強制畫面文字", listicleDirectorBlock(), "畫面文字開啟時才會接上。");
  }
  if (isComparisonCardSkill(slug)) {
    pushBlock(
      blocks,
      "對比卡（9:16）",
      comparisonCardDirectorBlock("9:16"),
      "畫面文字開啟時才會接上。橫向畫面會改成上下分欄。",
    );
  }
  if (isTalkingBrollSkill(slug)) pushBlock(blocks, "口播 B-roll", talkingBrollDirectorBlock());
  if (isEditorialInterviewSkill(slug)) pushBlock(blocks, "專訪", editorialInterviewDirectorBlock());
  if (isBookendSkill(slug)) {
    pushBlock(blocks, "片頭／片尾（無 logo，鎖長度）", bookendDirectorBlock(slug, false, { lockLength: true }));
    pushBlock(blocks, "片頭／片尾（有 logo，鎖長度）", bookendDirectorBlock(slug, true, { lockLength: true }));
  }
  if (isTalkingHeadSkill(slug)) {
    const shot = talkingShotForSkill(slug) ?? "face";
    const performance = resolvePerformance({ performance: director.performance }, shot, "en");
    pushBlock(
      blocks,
      "口播 Phase A 規則",
      talkingHeadDirectorBlock(slug, "9:16", performance, false, false, false),
      "樣本：英文 performance、9:16、字幕畫在靜幀上、允許畫面文字、非寫實。",
    );
    pushBlock(blocks, "口播時長提示", talkingHeadDurationHint(undefined, slug));
  }
  if (isSurpriseInterviewSkill(slug)) pushBlock(blocks, "突擊訪問", surpriseInterviewDirectorBlock());
  if (isOutfitReelSkill(slug)) pushBlock(blocks, "穿搭 reel", outfitReelDirectorBlock());
  if (isOutfitChangeSkill(slug)) pushBlock(blocks, "換裝", outfitChangeDirectorBlock());
  if (isStreetLookbookSkill(slug)) pushBlock(blocks, "街頭造型", streetLookbookDirectorBlock());
  if (isFollowShotSkill(slug)) pushBlock(blocks, "跟拍", followShotDirectorBlock());
  if (isWorkflowPromoSkill(slug)) pushBlock(blocks, "流程宣傳", workflowPromoDirectorBlock());
  if (isStyleSwitchSkill(slug)) {
    pushBlock(
      blocks,
      "多風格切換",
      styleSwitchDirectorBlock([
        { id: "style-1", name: "Style 1（樣本）" },
        { id: "style-2", name: "Style 2（樣本）" },
      ]),
      "風格 id 與名稱在生成時換成使用者選的風格。",
    );
  }
  return blocks;
}

function snapshotDirector(director: IDirector): HardcodedDirectorDetail {
  const phaseARefs = director.references.filter((ref) => !isPhaseBRef(ref) && !isExampleRef(ref));
  const phaseBRefs = director.references.filter(isPhaseBRef);
  return {
    id: director._id,
    slug: director.slug,
    title: director.title,
    description: director.description,
    suggestedUseCase: director.suggestedUseCase,
    sortOrder: director.sortOrder,
    isActive: director.isActive,
    hiddenInPicker: director.behavior.hiddenInPicker,
    previewUrl: director.previewUrl ?? null,
    createdAt: director.createdAt.toISOString(),
    updatedAt: director.updatedAt.toISOString(),
    behavior: behaviorRows(director.behavior),
    inputSchema: {
      requiresSource: director.inputSchema.requiresSource,
      aspectRatios: [...director.inputSchema.aspectRatios],
      durationPresets: [...director.inputSchema.durationPresets],
      optionalCharacterImage: director.inputSchema.optionalCharacterImage,
    },
    higgsfieldDefaults: { ...director.higgsfieldDefaults },
    profile: PROFILE_KEYS.map((key) => ({
      key,
      label: PROFILE_LABELS_EN[key],
      value: director.profile?.[key]?.trim() || "未設定",
    })),
    performance: director.performance
      ? (["en", "yue"] as const).map((language) => ({
          language,
          label: language === "en" ? "English" : "粵語",
          slots: PERFORMANCE_KEYS.map((key) => ({
            key,
            label: key,
            value: director.performance?.[language]?.[key]?.trim() || "未設定",
          })),
        }))
      : [],
    systemPrompt: director.systemPrompt,
    references: director.references.map((ref) => ({ path: ref.path, content: ref.content })),
    phaseAPrompt: joinPrompt(director.systemPrompt, phaseARefs),
    phaseBPrompt: joinPrompt(director.systemPrompt, phaseBRefs),
    runtimeBlocks: runtimeBlocks(director),
  };
}

// Read-only snapshot of every hardcoded director for the admin inspector.
export function listHardcodedDirectorCatalog(): HardcodedDirectorCatalog {
  return {
    storyboardModel: STORYBOARD_MODEL,
    storyboardThinking: STORYBOARD_THINKING_LEVEL,
    directors: DIRECTORS.map(snapshotDirector),
  };
}
