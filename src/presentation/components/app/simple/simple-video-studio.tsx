"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import type { AspectRatio, VideoQualityTier } from "@/model/project";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { createSimpleVideoAction } from "@/presentation/actions/projects";
import {
  readDefaultVideoQualityTier,
  writeDefaultVideoQualityTier,
} from "@/presentation/components/app/projects/new/brief-defaults";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import {
  CINEMATIC_VIDEO_CREDITS_PER_SECOND,
  ECONOMY_VIDEO_CREDITS_PER_SECOND,
  FRAME_COST,
} from "@/service/credit-costs";

const ASPECT_OPTIONS: readonly AspectRatio[] = ["9:16", "16:9", "1:1"];
const DURATION_OPTIONS = [5, 6, 8, 10] as const;

export function SimpleVideoStudio({
  characters,
  styles,
}: {
  characters: PublicCharacter[];
  styles: PublicStyle[];
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const isEn = locale === "en";

  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [durationSeconds, setDurationSeconds] = useState<number>(6);
  const [styleId, setStyleId] = useState<string>("realistic");
  const [videoQualityTier, setVideoQualityTier] = useState<VideoQualityTier>(() =>
    readDefaultVideoQualityTier(),
  );
  const [characterId, setCharacterId] = useState<string>(characters[0]?.id || "");
  const [firstFrameUrl, setFirstFrameUrl] = useState<string>("");
  const [lastFrameUrl, setLastFrameUrl] = useState<string>("");
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<"first" | "last" | "ref" | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const perSecondCost =
    videoQualityTier === "economy"
      ? ECONOMY_VIDEO_CREDITS_PER_SECOND
      : CINEMATIC_VIDEO_CREDITS_PER_SECOND;
  const estimatedCost =
    (firstFrameUrl ? 0 : FRAME_COST) + perSecondCost * durationSeconds;

  async function handleUploadImage(
    e: ChangeEvent<HTMLInputElement>,
    slot: "first" | "last" | "ref",
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingSlot(slot);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await uploadCharacterImageAction(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (slot === "first") setFirstFrameUrl(res.url);
      else if (slot === "last") setLastFrameUrl(res.url);
      else setReferenceImageUrls((prev) => [...prev, res.url].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handleSubmit() {
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await createSimpleVideoAction({
        prompt: prompt.trim(),
        aspectRatio,
        durationSeconds,
        styleId,
        videoQualityTier,
        ...(firstFrameUrl ? { firstFrameUrl } : {}),
        ...(lastFrameUrl ? { lastFrameUrl } : {}),
        ...(characterId ? { characterId } : {}),
        ...(referenceImageUrls.length > 0 ? { referenceImageUrls } : {}),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/app/videos/${res.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create video");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#A3FF47]/15 px-3 py-1 text-xs font-bold text-foreground">
          ⚡ {isEn ? "Simple Video Studio" : "Simple 極簡一鍵生片"}
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isEn
            ? "Prompt + First/Last Frame + Reference → Video"
            : "輸入 Prompt、首尾幀與參考圖，一鍵生成影片"}
        </h1>
        <p className="text-sm text-muted">
          {isEn
            ? "Generate single-shot clips directly in Economy mode (4 credits/s) or 2K Cinema mode (15 credits/s)."
            : "直接輸入動作描述、可選首尾幀（First / Last Frame）與角色／場景參考圖，支援 Economy 平價模式（4 credits/秒）或 2K Cinema 模式。"}
        </p>
      </div>

      <div className="space-y-5 rounded-3xl border border-accent-ink/12 bg-white p-5 shadow-sm sm:p-6">
        {/* Tier Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {isEn ? "Video Quality Tier" : "影片生成方案"}
          </span>
          <div className="inline-flex rounded-full border border-accent-ink/15 bg-paper p-1">
            {(["economy", "2k_cinema"] as const).map((tier) => {
              const active = videoQualityTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setVideoQualityTier(tier);
                    writeDefaultVideoQualityTier(tier);
                  }}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-[#12141c] text-[#A3FF47] shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tier === "economy"
                    ? isEn
                      ? "⚡ Economy · 4 credits/s"
                      : "⚡ Economy 平價 · 4 credits/秒"
                    : isEn
                      ? "🎬 2K Cinema · 15 credits/s"
                      : "🎬 2K Cinema · 15 credits/秒"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt Textarea */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-foreground">
            {isEn ? "Prompt (Action, Scene & Camera Motion)" : "影片 Prompt（動作、場景與運鏡描述）"}
          </label>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              isEn
                ? "Describe the scene, character action, and camera movement..."
                : "輸入角色動作、場景氣氛與鏡頭運動（例如：主角在夕陽咖啡店拿起茶杯微笑，鏡頭緩慢推近）..."
            }
            className="w-full rounded-2xl border border-accent-ink/15 bg-paper p-3.5 text-sm text-foreground outline-none transition focus:border-accent-ink"
          />
        </div>

        {/* First Frame / Last Frame / Reference Images */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* First Frame */}
          <div className="space-y-1.5 rounded-2xl border border-accent-ink/10 bg-paper/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {isEn ? "First Frame (Optional)" : "首幀 First Frame（可選）"}
              </span>
              {firstFrameUrl ? (
                <button
                  type="button"
                  onClick={() => setFirstFrameUrl("")}
                  className="cursor-pointer text-[11px] font-semibold text-muted hover:text-foreground"
                >
                  {isEn ? "Clear" : "移除"}
                </button>
              ) : null}
            </div>
            {firstFrameUrl ? (
              <img
                src={firstFrameUrl}
                alt="First frame"
                className="h-28 w-full rounded-xl object-cover"
              />
            ) : (
              <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-accent-ink/25 bg-white text-xs font-semibold text-muted hover:border-accent-ink hover:text-foreground">
                <span>
                  {uploadingSlot === "first"
                    ? isEn
                      ? "Uploading..."
                      : "上傳中..."
                    : isEn
                      ? "+ Upload First Frame"
                      : "+ 上傳起始畫格"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void handleUploadImage(e, "first")}
                />
              </label>
            )}
          </div>

          {/* Last Frame */}
          <div className="space-y-1.5 rounded-2xl border border-accent-ink/10 bg-paper/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {isEn ? "Last Frame (Optional)" : "尾幀 Last Frame（可選）"}
              </span>
              {lastFrameUrl ? (
                <button
                  type="button"
                  onClick={() => setLastFrameUrl("")}
                  className="cursor-pointer text-[11px] font-semibold text-muted hover:text-foreground"
                >
                  {isEn ? "Clear" : "移除"}
                </button>
              ) : null}
            </div>
            {lastFrameUrl ? (
              <img
                src={lastFrameUrl}
                alt="Last frame"
                className="h-28 w-full rounded-xl object-cover"
              />
            ) : (
              <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-accent-ink/25 bg-white text-xs font-semibold text-muted hover:border-accent-ink hover:text-foreground">
                <span>
                  {uploadingSlot === "last"
                    ? isEn
                      ? "Uploading..."
                      : "上傳中..."
                    : isEn
                      ? "+ Upload Last Frame"
                      : "+ 上傳結束畫格"}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void handleUploadImage(e, "last")}
                />
              </label>
            )}
          </div>

          {/* Reference Images */}
          <div className="space-y-1.5 rounded-2xl border border-accent-ink/10 bg-paper/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {isEn
                  ? `References (${referenceImageUrls.length}/4)`
                  : `參考圖 (${referenceImageUrls.length}/4)`}
              </span>
              {referenceImageUrls.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setReferenceImageUrls([])}
                  className="cursor-pointer text-[11px] font-semibold text-muted hover:text-foreground"
                >
                  {isEn ? "Clear" : "清空"}
                </button>
              ) : null}
            </div>
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-accent-ink/25 bg-white text-xs font-semibold text-muted hover:border-accent-ink hover:text-foreground">
              <span>
                {uploadingSlot === "ref"
                  ? isEn
                    ? "Uploading..."
                    : "上傳中..."
                  : isEn
                    ? "+ Add Reference Photo"
                    : "+ 新增場景／道具參考圖"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => void handleUploadImage(e, "ref")}
              />
            </label>
          </div>
        </div>

        {/* Character, Style, Aspect Ratio & Duration */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-muted">
              {isEn ? "Character (Optional)" : "鎖定角色（可選）"}
            </label>
            <select
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="w-full rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-xs font-semibold text-foreground"
            >
              <option value="">{isEn ? "None" : "不指定角色"}</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-muted">
              {isEn ? "Visual Style" : "視覺風格"}
            </label>
            <select
              value={styleId}
              onChange={(e) => setStyleId(e.target.value)}
              className="w-full rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-xs font-semibold text-foreground"
            >
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-muted">
              {isEn ? "Aspect Ratio" : "畫面比例"}
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="w-full rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-xs font-semibold text-foreground"
            >
              {ASPECT_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-muted">
              {isEn ? "Duration" : "影片秒數"}
            </label>
            <select
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              className="w-full rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-xs font-semibold text-foreground"
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={!prompt.trim() || submitting}
            onClick={() => void handleSubmit()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#A3FF47] px-6 py-3 text-sm font-black text-[#12141c] shadow-sm transition hover:brightness-95 disabled:opacity-50"
          >
            <span>
              {submitting
                ? isEn
                  ? "Generating..."
                  : "正在生成..."
                : isEn
                  ? `Generate Video · ${estimatedCost} credits`
                  : `一鍵生成影片 · ${estimatedCost} credits`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
