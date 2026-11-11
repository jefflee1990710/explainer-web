"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { AspectRatio, VideoQualityTier, VoLanguage } from "@/model/project";
import { prepareBrandUploadAction } from "@/presentation/actions/brand-upload";
import { startScroSwapJobAction } from "@/presentation/actions/jutsu";
import {
  createSimpleVideoAction,
  createVideoAction,
  ensureDefaultFolderAction,
} from "@/presentation/actions/projects";
import { startTeleportJobAction } from "@/presentation/actions/teleport";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { AuthForm } from "@/presentation/components/auth/auth-form";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";
import {
  FRAME_COST,
  VIDEO_CREDITS_PER_SECOND,
  scroSwapCost,
  teleportCost,
} from "@/service/credit-costs";

export type PublicCreationMode = "simple" | "economy" | "explainer" | "scroswap" | "teleport";

const PENDING_CREATION_STORAGE_KEY = "scro:pending-public-creation:v1";
const ASPECT_OPTIONS: readonly AspectRatio[] = ["9:16", "16:9", "1:1"];
const DURATION_OPTIONS = [5, 6, 8, 10] as const;

const SAMPLE_SWAP_VIDEO_URL =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/jutsu/6abcc45aebdb844ee2cd8413/6af164fd0fbcc24617fdd7d5/source-1794134832490.mp4";
const SAMPLE_SWAP_CHAR_URL =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters/6aeeb4f14bfa47590f1a2e35/6aeeb4f14bfa47590f1a2e34-portrait";

type PendingPublicCreationDraft = {
  mode: PublicCreationMode;
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  styleId: string;
  explainerSkillSlug?: string;
  language?: VoLanguage;
  videoQualityTier: VideoQualityTier;
  firstFrameDataUrl?: string;
  lastFrameDataUrl?: string;
  referenceDataUrls?: string[];
  sourceVideoUrl?: string;
  scenePrompt?: string;
  sceneImageDataUrl?: string;
};

async function dataUrlToUploadedBlobUrl(
  dataUrl: string,
  filename: string,
): Promise<string> {
  if (dataUrl.startsWith("https://")) return dataUrl;
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
  const form = new FormData();
  form.set("file", file);
  const res = await uploadCharacterImageAction(form);
  if (!res.ok) throw new Error(res.error);
  return res.url;
}

export function PublicStudioCreationHub({
  mode,
  signedIn: initialSignedIn,
  styles,
}: {
  mode: PublicCreationMode;
  signedIn: boolean;
  styles: PublicStyle[];
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const isEn = locale === "en";

  const isSimple = mode === "simple" || mode === "economy";
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [prompt, setPrompt] = useState(
    mode === "explainer"
      ? isEn
        ? "Why the 2-Minute Rule beats willpower for building daily habits"
        : "點解「兩分鐘法則」比靠意志力更容易養成每日習慣"
      : isSimple
        ? isEn
          ? "A young woman in a sleek trench coat walking through a neon-lit Tokyo alley at night, cinematic 35mm tracking shot"
          : "身穿風衣的主角在夜晚霓虹燈閃爍的東京街頭漫步回眸，35mm 電影推進鏡頭"
        : "",
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    mode === "explainer" ? "16:9" : "9:16",
  );
  const [durationSeconds, setDurationSeconds] = useState<number>(6);
  const [styleId, setStyleId] = useState<string>(
    mode === "explainer" ? "doodle" : "realistic",
  );
  const [explainerSkillSlug, setExplainerSkillSlug] = useState<string>(
    "paper-cutout-explainer-video-director",
  );
  const [language, setLanguage] = useState<VoLanguage>(
    locale === "zh-Hant" ? "yue" : locale === "zh-Hans" ? "zh" : "en",
  );
  const [videoQualityTier, setVideoQualityTier] =
    useState<VideoQualityTier>("2k_cinema");

  const [firstFrameDataUrl, setFirstFrameDataUrl] = useState<string>("");
  const [lastFrameDataUrl, setLastFrameDataUrl] = useState<string>("");
  const [referenceDataUrls, setReferenceDataUrls] = useState<string[]>(
    mode === "scroswap" ? [SAMPLE_SWAP_CHAR_URL] : [],
  );

  // For Scro Swap & Teleport
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string>(
    SAMPLE_SWAP_VIDEO_URL,
  );
  const [videoFileRef, setVideoFileRef] = useState<File | null>(null);
  const [scenePrompt, setScenePrompt] = useState<string>(
    mode === "teleport"
      ? isEn
        ? "Golden sunset rooftop overlooking the Eiffel Tower in Paris with warm amber light"
        : "巴黎鐵塔黃昏天台，溫暖金色夕陽光線"
      : "",
  );
  const [sceneImageDataUrl, setSceneImageDataUrl] = useState<string>("");

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-up" | "sign-in">("sign-up");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const autoTriggeredRef = useRef(false);

  const perSecondCost = VIDEO_CREDITS_PER_SECOND;

  const estimatedCost =
    mode === "scroswap"
      ? scroSwapCost({ mediaKind: "video", durationSeconds })
      : mode === "teleport"
        ? teleportCost({ durationSeconds })
        : mode === "explainer"
          ? FRAME_COST * 3 + perSecondCost * 15
          : (firstFrameDataUrl ? 0 : FRAME_COST) + perSecondCost * durationSeconds;

  function readFileAsDataUrl(
    e: ChangeEvent<HTMLInputElement>,
    slot: "first" | "last" | "ref" | "scene",
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      if (slot === "first") setFirstFrameDataUrl(result);
      else if (slot === "last") setLastFrameDataUrl(result);
      else if (slot === "scene") setSceneImageDataUrl(result);
      else setReferenceDataUrls((prev) => [...prev, result].slice(0, 4));
    };
    reader.readAsDataURL(file);
  }

  function handleVideoFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setVideoFileRef(file);
    setSourceVideoUrl(URL.createObjectURL(file));
  }

  async function uploadVideoFileIfNeeded(): Promise<string> {
    if (!videoFileRef) return sourceVideoUrl;
    const prep = await prepareBrandUploadAction({
      contentType: videoFileRef.type || "video/mp4",
      size: videoFileRef.size,
    });
    if (!prep.ok) throw new Error(prep.error);
    const { upload } = await import("@vercel/blob/client");
    const uploaded = await upload(prep.pathname, videoFileRef, {
      access: "public",
      handleUploadUrl: "/api/blob/brand-upload",
      contentType: prep.contentType,
    });
    return uploaded.url;
  }

  async function executeGeneration(draft?: PendingPublicCreationDraft) {
    const active: PendingPublicCreationDraft = draft ?? {
      mode,
      prompt: prompt.trim(),
      aspectRatio,
      durationSeconds,
      styleId,
      explainerSkillSlug,
      language,
      videoQualityTier,
      firstFrameDataUrl: firstFrameDataUrl || undefined,
      lastFrameDataUrl: lastFrameDataUrl || undefined,
      referenceDataUrls: referenceDataUrls.length > 0 ? referenceDataUrls : undefined,
      sourceVideoUrl,
      scenePrompt: scenePrompt.trim(),
      sceneImageDataUrl: sceneImageDataUrl || undefined,
    };

    setSubmitting(true);
    setError("");
    try {
      if (active.mode === "scroswap") {
        const finalVideoUrl = await uploadVideoFileIfNeeded();
        const refUrls = await Promise.all(
          (active.referenceDataUrls || [SAMPLE_SWAP_CHAR_URL]).map((u, idx) =>
            dataUrlToUploadedBlobUrl(u, `swap-ref-${idx + 1}.jpg`),
          ),
        );
        const res = await startScroSwapJobAction({
          sourceVideoUrl: finalVideoUrl,
          sectionStart: 0,
          sectionLength: active.durationSeconds,
          referenceImageUrl: refUrls[0],
          referenceImageUrls: refUrls,
          keepSourceAudio: true,
          applyColorFix: true,
        });
        if (!res.ok) {
          setError(res.error);
          setSubmitting(false);
          return;
        }
        window.sessionStorage.removeItem(PENDING_CREATION_STORAGE_KEY);
        router.push("/app/scroswap");
        return;
      }

      if (active.mode === "teleport") {
        const finalVideoUrl = await uploadVideoFileIfNeeded();
        const uploadedSceneUrl = active.sceneImageDataUrl
          ? await dataUrlToUploadedBlobUrl(active.sceneImageDataUrl, "teleport-scene.jpg")
          : undefined;
        const res = await startTeleportJobAction({
          sourceVideoUrl: finalVideoUrl,
          aspectRatio: active.aspectRatio,
          sectionStart: 0,
          sectionLength: active.durationSeconds,
          ...(uploadedSceneUrl ? { sceneImageUrl: uploadedSceneUrl } : {}),
          ...(active.scenePrompt ? { scenePrompt: active.scenePrompt } : {}),
          keepSourceAudio: true,
          applyColorFix: true,
        });
        if (!res.ok) {
          setError(res.error);
          setSubmitting(false);
          return;
        }
        window.sessionStorage.removeItem(PENDING_CREATION_STORAGE_KEY);
        router.push("/app/teleport");
        return;
      }

      if (active.mode === "explainer") {
        const folderRes = await ensureDefaultFolderAction();
        const form = new FormData();
        if (folderRes.ok) form.set("projectId", folderRes.folder.id);
        form.set(
          "skillSlug",
          active.explainerSkillSlug || "paper-cutout-explainer-video-director",
        );
        form.set("styleId", active.styleId || "doodle");
        form.set("source", active.prompt);
        form.set("aspectRatio", active.aspectRatio);
        form.set("durationPreset", "short");
        form.set("videoQualityTier", active.videoQualityTier);
        form.set("language", active.language || "en");
        form.set("voiceGender", "female");
        form.set("speechPace", "medium");
        form.set("sceneTextLanguage", active.language === "yue" || active.language === "zh" ? "zh-Hant" : "en");
        form.set("subtitleLook", "handwritten");
        form.set("textStyleId", "handwritten");
        const res = await createVideoAction(form);
        if (!res.ok) {
          setError(res.error);
          setSubmitting(false);
          return;
        }
        window.sessionStorage.removeItem(PENDING_CREATION_STORAGE_KEY);
        router.push(`/app/videos/${res.project.id}`);
        return;
      }

      // Default: Simple single-clip video creation (No Lip-Sync)
      const [firstFrameUrl, lastFrameUrl, ...refUrls] = await Promise.all([
        active.firstFrameDataUrl
          ? dataUrlToUploadedBlobUrl(active.firstFrameDataUrl, "first-frame.jpg")
          : Promise.resolve(undefined),
        active.lastFrameDataUrl
          ? dataUrlToUploadedBlobUrl(active.lastFrameDataUrl, "last-frame.jpg")
          : Promise.resolve(undefined),
        ...(active.referenceDataUrls || []).map((u, idx) =>
          dataUrlToUploadedBlobUrl(u, `ref-${idx + 1}.jpg`),
        ),
      ]);

      const res = await createSimpleVideoAction({
        prompt: active.prompt,
        aspectRatio: active.aspectRatio,
        durationSeconds: active.durationSeconds,
        styleId: active.styleId,
        videoQualityTier: active.videoQualityTier,
        ...(firstFrameUrl ? { firstFrameUrl } : {}),
        ...(lastFrameUrl ? { lastFrameUrl } : {}),
        ...(refUrls.length > 0 ? { referenceImageUrls: refUrls.filter(Boolean) as string[] } : {}),
      });
      if (!res.ok) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      window.sessionStorage.removeItem(PENDING_CREATION_STORAGE_KEY);
      router.push(`/app/videos/${res.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video");
      setSubmitting(false);
    }
  }

  function canClickGenerate(): boolean {
    if (submitting) return false;
    if (mode === "scroswap") return Boolean(sourceVideoUrl && referenceDataUrls.length > 0);
    if (mode === "teleport") return Boolean(sourceVideoUrl && (scenePrompt.trim() || sceneImageDataUrl));
    return Boolean(prompt.trim());
  }

  function handleClickGenerate() {
    if (!canClickGenerate()) return;
    setError("");
    const draft: PendingPublicCreationDraft = {
      mode,
      prompt: prompt.trim(),
      aspectRatio,
      durationSeconds,
      styleId,
      explainerSkillSlug,
      language,
      videoQualityTier,
      ...(firstFrameDataUrl ? { firstFrameDataUrl } : {}),
      ...(lastFrameDataUrl ? { lastFrameDataUrl } : {}),
      ...(referenceDataUrls.length > 0 ? { referenceDataUrls } : {}),
      sourceVideoUrl,
      scenePrompt: scenePrompt.trim(),
      ...(sceneImageDataUrl ? { sceneImageDataUrl } : {}),
    };
    try {
      window.sessionStorage.setItem(
        PENDING_CREATION_STORAGE_KEY,
        JSON.stringify(draft),
      );
    } catch {
      // Ignore quota errors
    }

    if (!signedIn) {
      setAuthMode("sign-up");
      setAuthDialogOpen(true);
      return;
    }
    void executeGeneration(draft);
  }

  useEffect(() => {
    if (autoTriggeredRef.current) return;
    try {
      const raw = window.sessionStorage.getItem(PENDING_CREATION_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PendingPublicCreationDraft;
      if (saved.mode !== mode) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved.prompt) setPrompt(saved.prompt);
      if (saved.aspectRatio) setAspectRatio(saved.aspectRatio);
      if (saved.durationSeconds) setDurationSeconds(saved.durationSeconds);
      if (saved.styleId) setStyleId(saved.styleId);
      if (saved.explainerSkillSlug) setExplainerSkillSlug(saved.explainerSkillSlug);
      if (saved.language) setLanguage(saved.language);
      if (saved.videoQualityTier) setVideoQualityTier(saved.videoQualityTier);
      if (saved.firstFrameDataUrl) setFirstFrameDataUrl(saved.firstFrameDataUrl);
      if (saved.lastFrameDataUrl) setLastFrameDataUrl(saved.lastFrameDataUrl);
      if (saved.referenceDataUrls) setReferenceDataUrls(saved.referenceDataUrls);
      if (saved.scenePrompt) setScenePrompt(saved.scenePrompt);
      if (saved.sceneImageDataUrl) setSceneImageDataUrl(saved.sceneImageDataUrl);

      if (initialSignedIn) {
        autoTriggeredRef.current = true;
        void executeGeneration(saved);
      }
    } catch {
      // Ignore parse errors
    }
  }, [initialSignedIn, mode]);

  const simpleHero = {
    kicker: isEn
      ? "Scro Simple Video Studio · Camera-First AI Video"
      : "Scro Simple 極簡生片工作台 · 鏡頭優先單鏡電影",
    title: isEn ? "Bring Your Shot to Life in One Pass" : "一鍵生成單鏡高畫質電影短片",
    sub: isEn
      ? `Generate 6–12s cinematic video clips with First/Last Frame latent lock & reference images at just 2 credits/s. Sign up to get ${WELCOME_CREDITS} Free Credits and generate right now!`
      : `每秒只需 2 credits（支援首尾幀 Latent 鎖定與參考圖，純視覺無 Lip-Sync）。新註冊即送 ${WELCOME_CREDITS} Free Credits 免費生片！`,
  };

  const modeTabs: Array<{ id: PublicCreationMode; href: string; label: string; badge: string }> = [
    {
      id: "simple",
      href: "/simple",
      label: isEn ? "⚡ Simple Video" : "⚡ Simple 極簡生片",
      badge: "2 cr/s",
    },
    {
      id: "explainer",
      href: "/explainer",
      label: isEn ? "📊 Explainer Video" : "📊 AI 解說動畫",
      badge: isEn ? "Paper-Cutout & Doodle" : "剪紙 / 白板圖表",
    },
    {
      id: "scroswap",
      href: "/scroswap",
      label: isEn ? "🎭 Scro Swap" : "🎭 Scro Swap 換角",
      badge: isEn ? "Character & Wardrobe" : "影片換人 / 換衫",
    },
    {
      id: "teleport",
      href: "/teleport",
      label: isEn ? "🌍 Teleport" : "🌍 Teleport 換場",
      badge: isEn ? "Scene Relocation" : "鎖人換背景",
    },
  ];

  const heroCopy = {
    simple: simpleHero,
    economy: simpleHero,
    explainer: {
      kicker: isEn
        ? "AI Explainer Video Director · 1-Click Storyboard & Diagrams"
        : "AI 概念解說片導演 · 一鍵生成結構化圖表動畫",
      title: isEn ? "Turn Any Topic Into a Viral Explainer Reel" : "輸入主題或文章，一鍵生成高留存解說短片",
      sub: isEn
        ? `Choose Paper-Cutout Collage, Whiteboard Doodle, or 3D Papercraft Diorama with ${WELCOME_CREDITS} Free Welcome Credits!`
        : `內建剪紙拼貼、白板手繪與 3D 紙雕模型三大解說導演，新註冊即送 ${WELCOME_CREDITS} Free Credits！`,
    },
    scroswap: {
      kicker: isEn
        ? "Scro Swap · SAM 3 Motion Mask + Identity & Outfit Lock"
        : "Scro Swap 影片換角與換裝 · SAM 3 動作鎖定",
      title: isEn ? "Swap Any Character or Outfit While Keeping Exact Motion" : "保留原片 100% 動作與光影，一鍵替換主角與穿搭",
      sub: isEn
        ? `Upload a source video (or use our sample kick clip) and drop in 1–4 character reference photos. Sign up to get ${WELCOME_CREDITS} Free Credits and run your first swap free!`
        : `上傳來源影片（或直接使用範例動作片）並放入角色／穿搭照片即可換角。新註冊即送 ${WELCOME_CREDITS} Free Credits 免費體驗！`,
    },
    teleport: {
      kicker: isEn
        ? "Scro Teleport · Lock the Person, Relocate the World"
        : "Scro Teleport 影片換場 · 鎖定人物與動作，一鍵瞬移場景",
      title: isEn ? "Teleport Any Video Subject Into a Brand-New Scene" : "保留原片人物與動作，一鍵放進全新電影場景",
      sub: isEn
        ? `Describe your new destination or upload a scene photo. Sign up to claim ${WELCOME_CREDITS} Free Credits and teleport your first video free!`
        : `輸入新場景描述或上傳場景照片，即可將原片人物無縫移入新世界。新註冊即送 ${WELCOME_CREDITS} Free Credits 免費體驗！`,
    },
  }[mode];

  return (
    <div className="bg-[#0a0c10] text-white">
      <section className="mx-auto max-w-5xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12">
        {/* Top Mode Switcher Pills (Dark Mode Studio Portal Style) */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {modeTabs.map((tab) => {
            const active = tab.id === mode || (mode === "economy" && tab.id === "simple");
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
                  active
                    ? "border-[#A3FF47] bg-[#A3FF47] text-[#12141c] shadow-[0_0_24px_rgba(163,255,71,0.35)]"
                    : "border-white/15 bg-[#141824] text-zinc-300 hover:border-white/30 hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    active ? "bg-[#12141c] text-[#A3FF47]" : "bg-white/10 text-zinc-300"
                  }`}
                >
                  {tab.badge}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Hero Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#A3FF47]/40 bg-[#A3FF47]/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#A3FF47]">
            {heroCopy.kicker}
          </span>
          <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-white sm:text-5xl">
            {heroCopy.title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-300 sm:text-base">
            {heroCopy.sub}
          </p>
        </div>

        {/* Interactive Dark Mode Portal Creation Studio Card */}
        <div className="mt-8 space-y-5 rounded-3xl border border-white/15 bg-[#131722] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.65)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#A3FF47] font-display text-sm font-black text-[#12141c]">
                S
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-white sm:text-lg">
                  {isSimple
                    ? isEn
                      ? "Simple Video Studio (No Lip-Sync)"
                      : "Simple 極簡生片工作台（無 Lip-Sync）"
                    : mode === "explainer"
                      ? isEn
                        ? "AI Explainer Storyboard Studio"
                        : "AI 解說短片創作工作台"
                      : mode === "scroswap"
                        ? isEn
                          ? "Scro Swap Studio"
                          : "Scro Swap 影片換角工作台"
                        : isEn
                          ? "Teleport Scene Studio"
                          : "Teleport 影片換場工作台"}
                </h2>
                <p className="text-xs text-zinc-400">
                  {isEn
                    ? `Configure your video below and click Generate — new users get ${WELCOME_CREDITS} Free Credits on sign-up!`
                    : `先喺下面輸入設定再撳生成 —— 未登入會彈出登入／註冊視窗，新註冊即用 ${WELCOME_CREDITS} Free Credits 免費生片！`}
                </p>
              </div>
            </div>

            {isSimple || mode === "explainer" ? (
              <div className="inline-flex items-center rounded-full border border-[#A3FF47]/30 bg-[#A3FF47]/15 px-3.5 py-1.5 text-xs font-bold text-[#A3FF47]">
                ⚡ 2 cr/s
              </div>
            ) : null}
          </div>

          {/* MODE 1 & 2: SIMPLE / EXPLAINER FORM */}
          {isSimple || mode === "explainer" ? (
            <>
              {mode === "explainer" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      slug: "paper-cutout-explainer-video-director",
                      name: isEn ? "✂️ Paper-Cutout Collage" : "✂️ 剪紙拼貼解說",
                      desc: isEn ? "Tactile die-cut craft board diagrams" : "高留存剪紙圖表拼貼",
                    },
                    {
                      slug: "cartoon-explainer-video-director",
                      name: isEn ? "✏️ Whiteboard Doodle" : "✏️ 白板手繪解說",
                      desc: isEn ? "2D marker sketch flowcharts" : "經典白板馬克筆手繪",
                    },
                    {
                      slug: "papercraft-diorama-director",
                      name: isEn ? "🏛️ 3D Papercraft Diorama" : "🏛️ 3D 立體紙雕模型",
                      desc: isEn ? "Folded cardstock miniature sets" : "立體摺紙微縮場景",
                    },
                  ].map((dir) => {
                    const active = explainerSkillSlug === dir.slug;
                    return (
                      <button
                        key={dir.slug}
                        type="button"
                        onClick={() => setExplainerSkillSlug(dir.slug)}
                        className={`cursor-pointer rounded-2xl border p-3.5 text-left transition ${
                          active
                            ? "border-[#A3FF47] bg-[#A3FF47]/10"
                            : "border-white/10 bg-[#0a0c10]/70 hover:border-white/25"
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{dir.name}</p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">{dir.desc}</p>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-200">
                  {mode === "explainer"
                    ? isEn
                      ? "Topic, Script, or Article to Explain"
                      : "輸入要解說的主題、觀點或文章內容"
                    : isEn
                      ? "Video Prompt (Scene, Action & Camera Motion — No Lip-Sync)"
                      : "影片 Prompt（描述場景、人物動作與運鏡 —— 純視覺無對嘴）"}
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === "explainer"
                      ? isEn
                        ? "Paste your topic, key facts, or script..."
                        : "貼上你想解說的主題、數據或文案..."
                      : isEn
                        ? "Describe the scene, subject action, and camera movement..."
                        : "描述場景、角色動作與鏡頭運動..."
                  }
                  className="w-full rounded-2xl border border-white/15 bg-[#0a0c10] p-3.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#A3FF47]"
                />
              </div>

              {isSimple ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[#0a0c10]/80 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200">
                        {isEn ? "First Frame (Optional)" : "首幀 First Frame（可選）"}
                      </span>
                      {firstFrameDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setFirstFrameDataUrl("")}
                          className="cursor-pointer text-[11px] font-semibold text-zinc-400 hover:text-white"
                        >
                          {isEn ? "Clear" : "移除"}
                        </button>
                      ) : null}
                    </div>
                    {firstFrameDataUrl ? (
                      <img
                        src={firstFrameDataUrl}
                        alt="First frame"
                        className="h-28 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-xs font-semibold text-zinc-400 hover:border-[#A3FF47] hover:text-white">
                        <span>{isEn ? "+ Select First Frame" : "+ 選擇起始畫格"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => readFileAsDataUrl(e, "first")}
                        />
                      </label>
                    )}
                  </div>

                  <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[#0a0c10]/80 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200">
                        {isEn ? "Last Frame (Optional)" : "尾幀 Last Frame（可選）"}
                      </span>
                      {lastFrameDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setLastFrameDataUrl("")}
                          className="cursor-pointer text-[11px] font-semibold text-zinc-400 hover:text-white"
                        >
                          {isEn ? "Clear" : "移除"}
                        </button>
                      ) : null}
                    </div>
                    {lastFrameDataUrl ? (
                      <img
                        src={lastFrameDataUrl}
                        alt="Last frame"
                        className="h-28 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-xs font-semibold text-zinc-400 hover:border-[#A3FF47] hover:text-white">
                        <span>{isEn ? "+ Select Last Frame" : "+ 選擇結束畫格"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => readFileAsDataUrl(e, "last")}
                        />
                      </label>
                    )}
                  </div>

                  <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[#0a0c10]/80 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200">
                        {isEn
                          ? `References (${referenceDataUrls.length}/4)`
                          : `參考圖 (${referenceDataUrls.length}/4)`}
                      </span>
                      {referenceDataUrls.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setReferenceDataUrls([])}
                          className="cursor-pointer text-[11px] font-semibold text-zinc-400 hover:text-white"
                        >
                          {isEn ? "Clear" : "清空"}
                        </button>
                      ) : null}
                    </div>
                    <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-xs font-semibold text-zinc-400 hover:border-[#A3FF47] hover:text-white">
                      <span>{isEn ? "+ Add Reference Photo" : "+ 新增角色／場景參考圖"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => readFileAsDataUrl(e, "ref")}
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                    {isEn ? "Visual Style" : "視覺風格"}
                  </label>
                  <select
                    value={styleId}
                    onChange={(e) => setStyleId(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#0a0c10] px-3 py-2.5 text-xs font-semibold text-white"
                  >
                    {styles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                    {isEn ? "Aspect Ratio" : "畫面比例"}
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="w-full rounded-xl border border-white/15 bg-[#0a0c10] px-3 py-2.5 text-xs font-semibold text-white"
                  >
                    {ASPECT_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {mode === "explainer" ? (
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                      {isEn ? "Voiceover Language" : "旁白語言"}
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as VoLanguage)}
                      className="w-full rounded-xl border border-white/15 bg-[#0a0c10] px-3 py-2.5 text-xs font-semibold text-white"
                    >
                      <option value="yue">廣東話 (Cantonese)</option>
                      <option value="en">English</option>
                      <option value="zh">國語 / 普通話 (Mandarin)</option>
                      <option value="ja">日本語 (Japanese)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                      {isEn ? "Duration" : "影片秒數"}
                    </label>
                    <select
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/15 bg-[#0a0c10] px-3 py-2.5 text-xs font-semibold text-white"
                    >
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}s ({perSecondCost * d} credits)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* MODE 3: SCRO SWAP FORM */}
          {mode === "scroswap" ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0a0c10]/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    1. {isEn ? "Source Motion Video" : "來源動作影片"}
                  </span>
                  <label className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-[#A3FF47] hover:bg-white/15">
                    {isEn ? "Upload MP4/MOV" : "上傳自訂影片"}
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={handleVideoFileSelect}
                    />
                  </label>
                </div>
                <video
                  src={sourceVideoUrl}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="h-52 w-full rounded-xl bg-black object-cover"
                />
              </div>

              <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0a0c10]/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    2. {isEn ? "Target Character / Outfit Photo" : "目標角色／穿搭照片"}
                  </span>
                  <label className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-[#A3FF47] hover:bg-white/15">
                    {isEn ? "+ Upload Photo" : "+ 上傳角色相"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        setReferenceDataUrls([]);
                        readFileAsDataUrl(e, "ref");
                      }}
                    />
                  </label>
                </div>
                {referenceDataUrls[0] ? (
                  <img
                    src={referenceDataUrls[0]}
                    alt="Target character"
                    className="h-52 w-full rounded-xl bg-black object-cover"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* MODE 4: TELEPORT FORM */}
          {mode === "teleport" ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0a0c10]/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    1. {isEn ? "Source Person Video" : "來源人物影片"}
                  </span>
                  <label className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-[#A3FF47] hover:bg-white/15">
                    {isEn ? "Upload MP4/MOV" : "上傳自訂影片"}
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={handleVideoFileSelect}
                    />
                  </label>
                </div>
                <video
                  src={sourceVideoUrl}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="h-52 w-full rounded-xl bg-black object-cover"
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0a0c10]/80 p-4">
                <span className="block text-xs font-bold text-white">
                  2. {isEn ? "New Scene Destination (Prompt or Photo)" : "目標新場景（文字描述或上傳背景圖）"}
                </span>
                <textarea
                  rows={3}
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  placeholder={
                    isEn
                      ? "Describe the new location and lighting mood..."
                      : "輸入你想瞬移過去嘅新場景與光影氣氛..."
                  }
                  className="w-full rounded-xl border border-white/15 bg-[#131722] p-3 text-xs text-white outline-none focus:border-[#A3FF47]"
                />
                {sceneImageDataUrl ? (
                  <div className="relative">
                    <img
                      src={sceneImageDataUrl}
                      alt="New scene"
                      className="h-24 w-full rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setSceneImageDataUrl("")}
                      className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="flex h-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-xs font-semibold text-zinc-400 hover:border-[#A3FF47] hover:text-white">
                    <span>{isEn ? "+ Or Upload Scene Photo" : "+ 或上傳新場景背景照片"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => readFileAsDataUrl(e, "scene")}
                    />
                  </label>
                )}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-400">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-zinc-400">
              {signedIn
                ? isEn
                  ? `Estimated cost: ${estimatedCost} credits`
                  : `預計扣除：${estimatedCost} credits`
                : isEn
                  ? `🎁 Sign up to get ${WELCOME_CREDITS} Free Credits — this job (${estimatedCost} cr) runs FREE after sign-up!`
                  : `🎁 新帳號免費獲贈 ${WELCOME_CREDITS} Credits —— 本次生成（${estimatedCost} cr）註冊後即刻免費扣點生成！`}
            </p>
            <button
              type="button"
              disabled={!canClickGenerate()}
              onClick={handleClickGenerate}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#A3FF47] px-7 py-3.5 text-sm font-black text-[#12141c] shadow-[0_0_28px_rgba(163,255,71,0.42)] transition hover:brightness-95 disabled:opacity-50"
            >
              <span>
                {submitting
                  ? isEn
                    ? "Generating Video..."
                    : "正在生成影片..."
                  : signedIn
                    ? isEn
                      ? `Generate Now · ${estimatedCost} credits`
                      : `立即生成 · ${estimatedCost} credits`
                    : isEn
                      ? `Generate Video with Free Credits (${estimatedCost} cr)`
                      : `用 Free Credits 免費生成影片 (${estimatedCost} cr)`}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Sign Up / Sign In Modal Dialog */}
      {authDialogOpen ? (
        <DialogBackdrop
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAuthDialogOpen(false);
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 text-[#12141c] shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setAuthDialogOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600 hover:bg-zinc-200"
            >
              ✕
            </button>
            <div className="mb-4 rounded-2xl bg-[#12141c] px-4 py-3 text-xs font-bold text-[#A3FF47]">
              🎁{" "}
              {isEn
                ? `Sign up or sign in to start generating your video right now! New accounts receive ${WELCOME_CREDITS} Free Credits.`
                : `登入或免費註冊即可立即生成你剛才設定好嘅影片！新註冊即送 ${WELCOME_CREDITS} Free Credits。`}
            </div>
            <AuthForm
              mode={authMode}
              nextPath={`/${mode}`}
              onSwitchMode={(nextMode) => setAuthMode(nextMode)}
              onAuthSuccess={async () => {
                setSignedIn(true);
                setAuthDialogOpen(false);
                await executeGeneration();
              }}
            />
          </div>
        </DialogBackdrop>
      ) : null}
    </div>
  );
}
