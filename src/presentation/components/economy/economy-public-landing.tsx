"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { AspectRatio, VideoQualityTier } from "@/model/project";
import { createSimpleVideoAction } from "@/presentation/actions/projects";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { AuthForm } from "@/presentation/components/auth/auth-form";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import { WELCOME_CREDITS } from "@/service/billing/welcome-credits";
import {
  CINEMATIC_VIDEO_CREDITS_PER_SECOND,
  ECONOMY_VIDEO_CREDITS_PER_SECOND,
  FRAME_COST,
} from "@/service/credit-costs";

const PENDING_ECONOMY_STORAGE_KEY = "scro:pending-economy-creation:v1";
const ASPECT_OPTIONS: readonly AspectRatio[] = ["9:16", "16:9", "1:1"];
const DURATION_OPTIONS = [5, 6, 8, 10] as const;

type PendingEconomyDraft = {
  prompt: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  styleId: string;
  videoQualityTier: VideoQualityTier;
  firstFrameDataUrl?: string;
  lastFrameDataUrl?: string;
  referenceDataUrls?: string[];
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

export function EconomyPublicLanding({
  signedIn: initialSignedIn,
  styles,
}: {
  signedIn: boolean;
  styles: PublicStyle[];
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const isEn = locale === "en";

  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [durationSeconds, setDurationSeconds] = useState<number>(6);
  const [styleId, setStyleId] = useState<string>("realistic");
  const [videoQualityTier, setVideoQualityTier] =
    useState<VideoQualityTier>("economy");
  const [firstFrameDataUrl, setFirstFrameDataUrl] = useState<string>("");
  const [lastFrameDataUrl, setLastFrameDataUrl] = useState<string>("");
  const [referenceDataUrls, setReferenceDataUrls] = useState<string[]>([]);

  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-up" | "sign-in">("sign-up");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const autoTriggeredRef = useRef(false);

  const perSecondCost =
    videoQualityTier === "economy"
      ? ECONOMY_VIDEO_CREDITS_PER_SECOND
      : CINEMATIC_VIDEO_CREDITS_PER_SECOND;
  const estimatedCost =
    (firstFrameDataUrl ? 0 : FRAME_COST) + perSecondCost * durationSeconds;

  function readFileAsDataUrl(
    e: ChangeEvent<HTMLInputElement>,
    slot: "first" | "last" | "ref",
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
      else setReferenceDataUrls((prev) => [...prev, result].slice(0, 4));
    };
    reader.readAsDataURL(file);
  }

  async function executeGeneration(draft?: PendingEconomyDraft) {
    const active: PendingEconomyDraft = draft ?? {
      prompt: prompt.trim(),
      aspectRatio,
      durationSeconds,
      styleId,
      videoQualityTier,
      firstFrameDataUrl: firstFrameDataUrl || undefined,
      lastFrameDataUrl: lastFrameDataUrl || undefined,
      referenceDataUrls: referenceDataUrls.length > 0 ? referenceDataUrls : undefined,
    };
    if (!active.prompt) return;
    setSubmitting(true);
    setError("");
    try {
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
      try {
        window.sessionStorage.removeItem(PENDING_ECONOMY_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
      router.push(`/app/videos/${res.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video");
      setSubmitting(false);
    }
  }

  function handleClickGenerate() {
    if (!prompt.trim() || submitting) return;
    setError("");
    const draft: PendingEconomyDraft = {
      prompt: prompt.trim(),
      aspectRatio,
      durationSeconds,
      styleId,
      videoQualityTier,
      ...(firstFrameDataUrl ? { firstFrameDataUrl } : {}),
      ...(lastFrameDataUrl ? { lastFrameDataUrl } : {}),
      ...(referenceDataUrls.length > 0 ? { referenceDataUrls } : {}),
    };
    try {
      window.sessionStorage.setItem(
        PENDING_ECONOMY_STORAGE_KEY,
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

  // Restore any saved draft on mount, and auto-submit if returning already signed-in
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    try {
      const raw = window.sessionStorage.getItem(PENDING_ECONOMY_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PendingEconomyDraft;
      if (saved.prompt) setPrompt(saved.prompt);
      if (saved.aspectRatio) setAspectRatio(saved.aspectRatio);
      if (saved.durationSeconds) setDurationSeconds(saved.durationSeconds);
      if (saved.styleId) setStyleId(saved.styleId);
      if (saved.videoQualityTier) setVideoQualityTier(saved.videoQualityTier);
      if (saved.firstFrameDataUrl) setFirstFrameDataUrl(saved.firstFrameDataUrl);
      if (saved.lastFrameDataUrl) setLastFrameDataUrl(saved.lastFrameDataUrl);
      if (saved.referenceDataUrls) setReferenceDataUrls(saved.referenceDataUrls);

      if (initialSignedIn && saved.prompt) {
        autoTriggeredRef.current = true;
        void executeGeneration(saved);
      }
    } catch {
      // Ignore parse errors
    }
  }, [initialSignedIn]);

  return (
    <div className="min-h-screen bg-[#0D1017] text-white">
      {/* Hero & Price Comparison Section */}
      <section className="mx-auto max-w-5xl px-4 pt-12 pb-8 sm:px-6 sm:pt-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#A3FF47]/40 bg-[#A3FF47]/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#A3FF47]">
            ⚡ {isEn ? "Scro Economy Video Engine · 80% Off Market Price" : "Scro Economy 平價生片引擎 · 比市價平 80%"}
          </span>
          <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-white sm:text-5xl">
            {isEn ? (
              <>
                AI Video Generation Can Actually Be{" "}
                <span className="text-[#A3FF47]">Super Cheap!</span>
              </>
            ) : (
              <>
                AI 影片生成原來可以{" "}
                <span className="text-[#A3FF47]">超平民化！</span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-300 sm:text-base">
            {isEn
              ? `Just 4 credits/second ($0.14/s) — only $0.86 for a 6-second video with First/Last Frame latent lock and Reference conditioning (no lip-sync). Sign up to get ${WELCOME_CREDITS} free credits and generate your first video free!`
              : `每秒只需 4 credits（約 $0.14 USD/秒）—— 一條 6 秒高清影片僅需 $0.86 USD（鎖定首尾幀 Latent 與角色／場景參考圖，純視覺動作無 Lip-Sync）。新註冊即送 ${WELCOME_CREDITS} 免費 Credits 直接免費生片！`}
          </p>
        </div>

        {/* 3-Card Price Comparison */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-red-400">
              {isEn ? "Market Average (6s Clip)" : "市面一般平台（6 秒片）"}
            </p>
            <p className="mt-2 font-display text-3xl font-black text-red-400 line-through">
              $4.20 USD
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {isEn
                ? "~$0.70/s effective cost across typical tools"
                : "一般 AI 影片工具平均每條 6 秒片成本"}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#A3FF47] bg-[#A3FF47]/10 p-5 shadow-[0_0_35px_rgba(163,255,71,0.18)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-[#A3FF47]">
                {isEn ? "Scro Economy (6s Clip)" : "Scro Economy 平價模式"}
              </p>
              <span className="rounded-full bg-[#A3FF47] px-2.5 py-0.5 text-[10px] font-black text-[#12141c]">
                80% OFF
              </span>
            </div>
            <p className="mt-2 font-display text-3xl font-black text-white">
              $0.86 USD{" "}
              <span className="text-sm font-bold text-[#A3FF47]">
                (4 credits/s)
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-300">
              {isEn
                ? "First/Last Frame Latent Lock + Reference Images (No Lip-Sync)"
                : "支援 First/Last Frame 首尾幀鎖定 + 參考圖（純視覺動作無 Lip-Sync）"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              {isEn ? "Free Welcome Gift" : "新用戶免費體驗額度"}
            </p>
            <p className="mt-2 font-display text-3xl font-black text-[#A3FF47]">
              {WELCOME_CREDITS} Credits
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {isEn
                ? "Enough for up to 5 free 6-second Economy videos on sign-up!"
                : "註冊即送 145 Free Credits，足夠免費生成多達 5 條 6 秒 Economy 影片！"}
            </p>
          </div>
        </div>
      </section>

      {/* Public Interactive Creation Form */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <div className="space-y-5 rounded-3xl border border-white/15 bg-[#151924] p-5 shadow-2xl sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-white sm:text-xl">
                {isEn
                  ? "Create Your Video Now (No Lip-Sync · Visual Action)"
                  : "立即輸入設定生成影片（純視覺動作 · 無 Lip-Sync）"}
              </h2>
              <p className="text-xs text-zinc-400">
                {isEn
                  ? "Fill in your prompt, optional first/last frames & references below, then click Generate!"
                  : "先填好以下 Prompt、首尾幀與參考圖，撳「免費生成影片」即可登入／註冊並用 Free Credits 生成！"}
              </p>
            </div>

            <div className="inline-flex rounded-full border border-white/15 bg-[#0D1017] p-1">
              {(["economy", "2k_cinema"] as const).map((tier) => {
                const active = videoQualityTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setVideoQualityTier(tier)}
                    className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      active
                        ? "bg-[#A3FF47] text-[#12141c]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tier === "economy"
                      ? isEn
                        ? "⚡ Economy · 4 cr/s"
                        : "⚡ Economy 平價 · 4 cr/s"
                      : "🎬 2K Cinema · 15 cr/s"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-200">
              {isEn
                ? "Video Prompt (Scene, Subject Action & Camera Movement — No Lip-Sync)"
                : "影片 Prompt（描述場景、人物動作與運鏡 —— 純視覺無對嘴）"}
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isEn
                  ? "e.g., A young woman in a sleek trench coat walking through a neon-lit Tokyo alley at night in slow motion, cinematic 35mm tracking shot..."
                  : "例如：身穿風衣的主角在夜晚霓虹燈閃爍的東京街頭漫步回眸，35mm 電影推進鏡頭..."
              }
              className="w-full rounded-2xl border border-white/15 bg-[#0D1017] p-3.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#A3FF47]"
            />
          </div>

          {/* First Frame / Last Frame / Reference Images */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* First Frame */}
            <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[#0D1017]/80 p-3.5">
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
                  <span>
                    {isEn ? "+ Select First Frame" : "+ 選擇起始畫格"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => readFileAsDataUrl(e, "first")}
                  />
                </label>
              )}
            </div>

            {/* Last Frame */}
            <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[#0D1017]/80 p-3.5">
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
                  <span>
                    {isEn ? "+ Select Last Frame" : "+ 選擇結束畫格"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => readFileAsDataUrl(e, "last")}
                  />
                </label>
              )}
            </div>

            {/* Reference Images */}
            <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[#0D1017]/80 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">
                  {isEn
                    ? `References (${referenceDataUrls.length}/4)`
                    : `角色／場景參考圖 (${referenceDataUrls.length}/4)`}
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
                <span>
                  {isEn ? "+ Add Reference Photo" : "+ 新增角色／場景參考圖"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => readFileAsDataUrl(e, "ref")}
                />
              </label>
            </div>
          </div>

          {/* Style, Aspect Ratio & Duration */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                {isEn ? "Visual Style" : "視覺風格"}
              </label>
              <select
                value={styleId}
                onChange={(e) => setStyleId(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0D1017] px-3 py-2.5 text-xs font-semibold text-white"
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
                className="w-full rounded-xl border border-white/15 bg-[#0D1017] px-3 py-2.5 text-xs font-semibold text-white"
              >
                {ASPECT_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-zinc-400">
                {isEn ? "Duration" : "影片秒數"}
              </label>
              <select
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full rounded-xl border border-white/15 bg-[#0D1017] px-3 py-2.5 text-xs font-semibold text-white"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}s ({perSecondCost * d} credits)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-400">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-zinc-400">
              {signedIn
                ? isEn
                  ? `Cost: ${estimatedCost} credits (Economy ${perSecondCost} credits/s · No Lip-Sync)`
                  : `預計扣除：${estimatedCost} credits（Economy ${perSecondCost} credits/秒 · 無 Lip-Sync）`
                : isEn
                  ? `New accounts receive ${WELCOME_CREDITS} Free Credits — this video costs ${estimatedCost} credits (FREE after sign-up!)`
                  : `新帳號免費獲贈 ${WELCOME_CREDITS} Credits —— 本次生成僅需 ${estimatedCost} credits（註冊後即刻免費扣點生成！）`}
            </p>
            <button
              type="button"
              disabled={!prompt.trim() || submitting}
              onClick={handleClickGenerate}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#A3FF47] px-7 py-3.5 text-sm font-black text-[#12141c] shadow-[0_0_25px_rgba(163,255,71,0.4)] transition hover:brightness-95 disabled:opacity-50"
            >
              <span>
                {submitting
                  ? isEn
                    ? "Generating Video..."
                    : "正在生成影片..."
                  : signedIn
                    ? isEn
                      ? `Generate Video · ${estimatedCost} credits`
                      : `立即生成影片 · ${estimatedCost} credits`
                    : isEn
                      ? `Generate Video with Free Credits (${estimatedCost} cr)`
                      : `用 Free Credits 免費生成影片 (${estimatedCost} cr)`}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Sign Up / Sign In Modal Dialog triggered when an unauthenticated user clicks Generate */}
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
                ? `Sign up or sign in to generate your video now! New accounts get ${WELCOME_CREDITS} Free Credits.`
                : `登入或免費註冊即可立即生成你剛才填好嘅影片！新註冊即送 ${WELCOME_CREDITS} Free Credits。`}
            </div>
            <AuthForm
              mode={authMode}
              nextPath="/economy"
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
