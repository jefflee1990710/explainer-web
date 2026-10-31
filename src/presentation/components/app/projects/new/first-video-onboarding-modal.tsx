"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { acceptCurrentPolicies } from "@/presentation/actions/legal";
import { track, trackAsync } from "@/presentation/components/analytics/track";
import { CharacterPicker } from "@/presentation/components/app/projects/[id]/character-picker";
import { SkillPicker } from "@/presentation/components/app/projects/[id]/skill-picker";
import {
  DEFAULT_STARTER_CHARACTER_NAME,
  PICKER_DEFAULT_SKILL_SLUG,
  defaultCastIdsForStyle,
  defaultSceneTextLanguageForLocale,
  defaultVoLanguageForLocale,
} from "@/presentation/components/app/projects/new/brief-defaults";
import {
  SAMPLE_PRESETS,
  sampleApplyFor,
} from "@/presentation/components/app/projects/new/sample-script-presets";
import {
  ruleSlugFor,
} from "@/presentation/components/app/projects/new/skill-selection";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StylePicker } from "@/presentation/components/style-picker";
import type {
  PublicCharacter,
  PublicSkill,
  PublicStyle,
} from "@/presentation/serialize";
import type { CharacterSelectionMap } from "@/service/character/character-presets";
import { requiredCastCount } from "@/service/director/skill-rules";
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import { pickerDefaultStyleId } from "@/service/style";

const FIRST_VIDEO_MODAL_DISMISSED_KEY = "scro:first-video-onboarding-dismissed:v1";
const FIRST_VIDEO_DEFAULT_STYLE_ID = "realistic";

export type FirstVideoModalDefaults = {
  skillSlug: string;
  styleId: string;
  characterIds: string[];
};

// Pure helper: resolves the 4-option onboarding defaults (Paper-cutout explainer + Cinematic realistic + Aera).
export function resolveFirstVideoModalDefaults(input: {
  skills: ReadonlyArray<{ slug: string; behaviorSlug?: string }>;
  styles: ReadonlyArray<{ id: string }>;
  characters: ReadonlyArray<{
    id: string;
    name?: string;
    styleId: string;
    styleIds?: string[];
    previewUrl?: string | null;
  }>;
}): FirstVideoModalDefaults {
  const skillSlug = input.skills.some((s) => s.slug === PICKER_DEFAULT_SKILL_SLUG)
    ? PICKER_DEFAULT_SKILL_SLUG
    : input.skills[0]?.slug || PICKER_DEFAULT_SKILL_SLUG;

  const styleId = input.styles.some((s) => s.id === FIRST_VIDEO_DEFAULT_STYLE_ID)
    ? FIRST_VIDEO_DEFAULT_STYLE_ID
    : pickerDefaultStyleId(input.styles) || FIRST_VIDEO_DEFAULT_STYLE_ID;

  const behaviorSlug =
    input.skills.find((s) => s.slug === skillSlug)?.behaviorSlug || skillSlug;
  const need = Math.max(1, requiredCastCount(behaviorSlug));

  let characterIds = defaultCastIdsForStyle(input.characters, styleId, need);
  if (characterIds.length === 0 && input.characters.length > 0) {
    const aera = input.characters.find(
      (c) => c.name?.trim().toLowerCase() === DEFAULT_STARTER_CHARACTER_NAME.toLowerCase(),
    );
    characterIds = [aera?.id ?? input.characters[0]!.id];
  }

  return {
    skillSlug,
    styleId,
    characterIds,
  };
}

// Pure helper: determines whether the full-screen first-video onboarding popup should open.
export function shouldShowFirstVideoModal(input: {
  hasAnyVideo: boolean;
  hasInitialVideo: boolean;
  dismissedInSession: boolean;
}): boolean {
  if (input.hasInitialVideo) return false;
  if (input.hasAnyVideo) return false;
  if (input.dismissedInSession) return false;
  return true;
}

export function isFirstVideoModalDismissedInSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(FIRST_VIDEO_MODAL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFirstVideoModalDismissedInSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FIRST_VIDEO_MODAL_DISMISSED_KEY, "1");
  } catch {
    // Ignore storage quota errors.
  }
}

export type FirstVideoQuickSubmitPayload = {
  skillSlug: string;
  styleId: string;
  characterIds: string[];
  characterSelections: CharacterSelectionMap;
  content: string;
  talkingHead: boolean;
};

// Full-screen onboarding popup shown to newly registered / logged-in users who have 0 videos.
// Presents just 4 choices: Character (default Aera), Director (default Paper-cutout explainer),
// Style (default Cinematic realistic), and Content (free-text textarea).
export function FirstVideoOnboardingModal({
  open,
  skills,
  styles,
  characters,
  credits,
  subscribed,
  submitting,
  externalError,
  onSkip,
  onSubmitFirstVideo,
}: {
  open: boolean;
  skills: PublicSkill[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  credits: number;
  subscribed: boolean;
  submitting: boolean;
  externalError?: string;
  onSkip: () => void;
  onSubmitFirstVideo: (payload: FirstVideoQuickSubmitPayload) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const contentId = useId();

  const defaults = useMemo(
    () => resolveFirstVideoModalDefaults({ skills, styles, characters }),
    [skills, styles, characters],
  );

  const [skillSlug, setSkillSlug] = useState<string>(defaults.skillSlug);
  const [styleId, setStyleId] = useState<string>(defaults.styleId);
  const [characterIds, setCharacterIds] = useState<string[]>(defaults.characterIds);
  const [characterSelections, setCharacterSelections] = useState<CharacterSelectionMap>({});
  const [content, setContent] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");

  const ruleSlug = ruleSlugFor(skillSlug, skills);
  const castNeed = requiredCastCount(ruleSlug);
  const talkingHead = isTalkingHeadSkill(ruleSlug);
  const effectiveCharacterIds =
    characterIds.length > 0 ? characterIds : defaults.characterIds;

  useEffect(() => {
    if (!open) return;
    track("onboarding_first_video_popup_shown", {
      default_skill: defaults.skillSlug,
      default_style: defaults.styleId,
      default_character_count: defaults.characterIds.length,
    });
  }, [open, defaults.skillSlug, defaults.styleId, defaults.characterIds.length]);

  if (!open || typeof document === "undefined") return null;

  const isZhHant = locale === "zh-Hant";
  const isZhHans = locale === "zh-Hans";

  const copy = {
    eyebrow: isZhHant
      ? "歡迎來到 SCRO · 1 分鐘完成首條 AI 短片"
      : isZhHans
        ? "欢迎来到 SCRO · 1 分钟完成首条 AI 短片"
        : "WELCOME TO SCRO · START YOUR FIRST AI VIDEO",
    title: isZhHant
      ? "建立你嘅第一條 AI 短片"
      : isZhHans
        ? "创建你的第一支 AI 短视频"
        : "Create Your First AI Video",
    subtitle: isZhHant
      ? "我哋已為你預設最受歡迎嘅組合（紙雕概念解說 ＋ 電影級寫實 ＋ 角色 Aera）。只需確認呢 4 個選項並輸入你想講嘅內容，AI 導演即刻為你生成！"
      : isZhHans
        ? "我们已为你预设最受欢迎的组合（纸雕概念解说 ＋ 电影级写实 ＋ 角色 Aera）。只需确认这 4 个选项并输入你想讲的内容，AI 导演立即为你生成！"
        : "We pre-selected our best-performing setup (Paper-Cutout Explainer + Cinematic Realistic + Aera). Review the 4 options below, type your topic or script, and generate your first video.",
    skipBtn: isZhHant
      ? "稍後再建，先睇工作台"
      : isZhHans
        ? "稍后再建，先看工作台"
        : "Skip to Studio",
    opt1Title: isZhHant
      ? "1. 導演類型 (Director)"
      : isZhHans
        ? "1. 导演类型 (Director)"
        : "1. Director Type",
    opt1Hint: isZhHant
      ? "預設：紙雕概念解說（Paper-cutout concept explainer）"
      : isZhHans
        ? "预设：纸雕概念解说（Paper-cutout concept explainer）"
        : "Default: Paper-cutout concept explainer",
    opt2Title: isZhHant
      ? "2. 視覺風格 (Style)"
      : isZhHans
        ? "2. 视觉风格 (Style)"
        : "2. Visual Style",
    opt2Hint: isZhHant
      ? "預設：電影級寫實（Cinematic realistic）"
      : isZhHans
        ? "预设：电影级写实（Cinematic realistic）"
        : "Default: Cinematic realistic",
    opt3Title: isZhHant
      ? "3. 演出角色 (Character)"
      : isZhHans
        ? "3. 演出角色 (Character)"
        : "3. Character",
    opt3Hint: isZhHant
      ? "預設角色：Aera（可點擊更換或新建角色）"
      : isZhHans
        ? "预设角色：Aera（可点击更换或新建角色）"
        : "Default character: Aera (click to switch or create)",
    opt4Title: isZhHant
      ? "4. 影片內容 / 腳本 (Content)"
      : isZhHans
        ? "4. 视频内容 / 脚本 (Content)"
        : "4. Video Content / Script",
    opt4Hint: isZhHant
      ? "自由輸入你想解說嘅主題、產品賣點或台詞，或撳下方範例一鍵填入"
      : isZhHans
        ? "自由输入你想解说的主题、产品卖点或台词，或点击下方范例一键填入"
        : "Type your topic, product pitch, or script below — or click a sample topic to try immediately",
    sampleLabel: isZhHant
      ? "一鍵試用熱門範例："
      : isZhHans
        ? "一键试用热门范例："
        : "Try a sample topic:",
    placeholder: isZhHant
      ? "例如：點解巴菲特話複利係世界第八大奇蹟？假設你每日儲起買一杯咖啡嘅 40 蚊，擺入年化回報率 8% 嘅指數基金……"
      : isZhHans
        ? "例如：为什么巴菲特说复利是世界第八大奇迹？假设你每天存下买一杯咖啡的钱，投入年化收益率 8% 的指数基金……"
        : "e.g. Why is compound interest called the eighth wonder of the world? Imagine saving the price of one coffee a day in an 8% index fund...",
    emptyError: isZhHant
      ? "請輸入影片內容或點選上方範例主題"
      : isZhHans
        ? "请输入视频内容或点选上方范例主题"
        : "Please enter your video content or pick a sample topic above.",
    submitBtn: isZhHant
      ? "立即開始生成第一條短片"
      : isZhHans
        ? "立即开始生成第一支短视频"
        : "Start Generating My First Video",
    submittingBtn: isZhHant
      ? "AI 導演正在建立專案…"
      : isZhHans
        ? "AI 导演正在创建项目…"
        : "Starting your first video…",
    legalPrefix: isZhHant
      ? "點擊開始生成或進入工作台即代表你同意 "
      : isZhHans
        ? "点击开始生成或进入工作台即代表你同意 "
        : "By continuing, you agree to our ",
    legalAnd: isZhHant ? " 與 " : isZhHans ? " 与 " : " and ",
  };

  function handleStyleChange(nextStyleId: string) {
    setStyleId(nextStyleId);
    setCharacterSelections({});
    const nextCast = defaultCastIdsForStyle(
      characters,
      nextStyleId,
      Math.max(1, castNeed),
    );
    setCharacterIds(nextCast);
  }

  function handleSkillChange(nextSlug: string) {
    setSkillSlug(nextSlug);
    const nextRule = ruleSlugFor(nextSlug, skills);
    const nextNeed = requiredCastCount(nextRule);
    if (nextNeed > 0 && characterIds.length === 0) {
      setCharacterIds(defaultCastIdsForStyle(characters, styleId, nextNeed));
    }
  }

  async function handleSkip() {
    if (submitting) return;
    markFirstVideoModalDismissedInSession();
    track("onboarding_first_video_popup_skipped", {
      skill_slug: skillSlug,
      style_id: styleId,
    });
    void acceptCurrentPolicies({ terms: true, privacy: true }).catch(() => {});
    onSkip();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const trimmed = content.trim();
    if (!trimmed) {
      setLocalError(copy.emptyError);
      return;
    }
    setLocalError("");

    const finalCharacterIds =
      effectiveCharacterIds.length > 0
        ? effectiveCharacterIds
        : defaultCastIdsForStyle(characters, styleId, Math.max(1, castNeed));

    // Ensure first-time legal policies are accepted seamlessly so the user isn't blocked by a second modal.
    await acceptCurrentPolicies({ terms: true, privacy: true }).catch(() => {});
    await trackAsync("onboarding_first_video_popup_submitted", {
      skill_slug: skillSlug,
      style_id: styleId,
      character_id: finalCharacterIds[0] ?? null,
      content_length: trimmed.length,
      vo_language: defaultVoLanguageForLocale(locale),
      scene_text_language: defaultSceneTextLanguageForLocale(locale),
    });

    markFirstVideoModalDismissedInSession();
    await onSubmitFirstVideo({
      skillSlug,
      styleId,
      characterIds: finalCharacterIds,
      characterSelections,
      content: trimmed,
      talkingHead,
    });
  }

  const displayedError = localError || externalError || "";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[220] flex flex-col overflow-y-auto bg-[#12141c]/80 backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-4 py-6 sm:px-6 sm:py-10">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col overflow-hidden rounded-[2rem] border-2 border-[#12141c] bg-[#f7f5f0] text-[#12141c] shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
        >
          {/* Top Header Bar */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#12141c]/12 bg-white px-5 py-5 sm:px-8 sm:py-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12141c] px-3 py-1 font-display text-[11px] font-bold tracking-wider text-[#c6f24b] uppercase">
                <SparkleDotIcon />
                {copy.eyebrow}
              </span>
              <h1
                id={titleId}
                className="mt-2.5 font-display text-2xl font-bold tracking-tight text-[#12141c] sm:text-3xl"
              >
                {copy.title}
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5c6170] sm:text-sm">
                {copy.subtitle}
              </p>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSkip()}
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#12141c]/20 bg-white px-4 py-2 text-xs font-semibold text-[#5c6170] transition hover:border-[#12141c] hover:text-[#12141c] disabled:opacity-50"
            >
              <span>{copy.skipBtn}</span>
              <CloseCrossIcon />
            </button>
          </div>

          {/* 4 Options Body */}
          <div className="space-y-5 p-5 sm:p-8">
            {/* Row 1: Option 1 (Director) */}
            <div className="rounded-2xl border border-[#12141c]/12 bg-white p-4 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:p-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-[#12141c] sm:text-base">
                  {copy.opt1Title}
                </h2>
                <span className="text-xs font-medium text-[#5c6170]">
                  {copy.opt1Hint}
                </span>
              </div>
              <SkillPicker
                skills={skills}
                value={skillSlug}
                onChange={handleSkillChange}
                disabled={submitting}
              />
            </div>

            {/* Row 2: Option 2 (Style) & Option 3 (Character) */}
            <div className="grid gap-4 md:grid-cols-2 lg:items-stretch">
              <div className="flex flex-col justify-between rounded-2xl border border-[#12141c]/12 bg-white p-4 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:p-5">
                <div className="mb-3">
                  <h2 className="font-display text-sm font-bold text-[#12141c] sm:text-base">
                    {copy.opt2Title}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5c6170]">{copy.opt2Hint}</p>
                </div>
                <StylePicker
                  styles={styles}
                  value={styleId}
                  onChange={handleStyleChange}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-[#12141c]/12 bg-white p-4 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:p-5">
                <div className="mb-3">
                  <h2 className="font-display text-sm font-bold text-[#12141c] sm:text-base">
                    {copy.opt3Title}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5c6170]">{copy.opt3Hint}</p>
                </div>
                <CharacterPicker
                  characters={characters}
                  styles={styles}
                  styleId={styleId}
                  value={effectiveCharacterIds}
                  onChange={setCharacterIds}
                  onSelectStyle={handleStyleChange}
                  selections={characterSelections}
                  onSelectionsChange={setCharacterSelections}
                  credits={credits}
                  subscribed={subscribed}
                  disabled={submitting}
                  max={castNeed > 0 ? castNeed : 4}
                  required={castNeed}
                />
              </div>
            </div>

            {/* Row 3: Option 4 (Content Free-Text Textarea + Sample Topic Chips) */}
            <div className="rounded-2xl border border-[#12141c]/12 bg-white p-4 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor={contentId}
                  className="font-display text-sm font-bold text-[#12141c] sm:text-base"
                >
                  {copy.opt4Title}
                </label>
                <span className="text-xs text-[#5c6170]">{copy.opt4Hint}</span>
              </div>

              {/* Sample Topic Chips so 0-video users can test with 1 click */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#5c6170]">
                  {copy.sampleLabel}
                </span>
                {SAMPLE_PRESETS.map((preset) => {
                  const label = isZhHant
                    ? preset.labelZhHant
                    : isZhHans
                      ? preset.labelZhHans
                      : preset.labelEn;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        const applied = sampleApplyFor(preset, locale, talkingHead);
                        setContent(
                          talkingHead
                            ? applied.spokenScript || applied.source
                            : applied.source,
                        );
                        setLocalError("");
                      }}
                      className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-[#12141c]/15 bg-[#f7f5f0] px-3 py-1 text-xs font-semibold text-[#12141c] transition hover:border-[#12141c] hover:bg-[#c6f24b]/35 disabled:opacity-50"
                    >
                      {label.replace(/^[^\p{L}\p{N}]+\s*/u, "")}
                    </button>
                  );
                })}
              </div>

              <textarea
                id={contentId}
                rows={4}
                disabled={submitting}
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  if (localError) setLocalError("");
                }}
                placeholder={copy.placeholder}
                className="mt-3 w-full resize-y rounded-xl border border-[#12141c]/20 bg-[#fcfbf9] p-3.5 text-base leading-relaxed text-[#12141c] outline-none transition placeholder:text-[#5c6170]/60 focus:border-[#12141c] focus:bg-white focus:ring-2 focus:ring-[#12141c]/10"
              />

              {displayedError ? (
                <p
                  role="alert"
                  className="mt-2.5 text-xs font-semibold text-red-600 sm:text-sm"
                >
                  {displayedError}
                </p>
              ) : null}
            </div>
          </div>

          {/* Footer CTA Bar */}
          <div className="flex flex-col items-stretch justify-between gap-4 border-t border-[#12141c]/12 bg-white px-5 py-4 sm:flex-row sm:items-center sm:px-8 sm:py-5">
            <p className="text-xs text-[#5c6170]">
              {copy.legalPrefix}
              <Link
                href="/terms"
                target="_blank"
                className="font-semibold text-[#12141c] underline"
              >
                {t("legal.terms")}
              </Link>
              {copy.legalAnd}
              <Link
                href="/privacy"
                target="_blank"
                className="font-semibold text-[#12141c] underline"
              >
                {t("legal.privacy")}
              </Link>
              .
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-full border-2 border-[#12141c] bg-[#c6f24b] px-7 py-3 font-display text-sm font-bold text-[#12141c] shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : <PlayArrowIcon />}
              <span>{submitting ? copy.submittingBtn : copy.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function SparkleDotIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 1.5 9.6 6.4 14.5 8 9.6 9.6 8 14.5 6.4 9.6 1.5 8 6.4 6.4 8 1.5Z" />
    </svg>
  );
}

function PlayArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4.5 3.2a.8.8 0 0 1 1.2-.7l7 4.8a.8.8 0 0 1 0 1.4l-7 4.8a.8.8 0 0 1-1.2-.7V3.2Z" />
    </svg>
  );
}

function CloseCrossIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
