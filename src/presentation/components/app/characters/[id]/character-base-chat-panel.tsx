"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyCharacterBaseVersionAction,
  retryCharacterVersionAction,
  sendCharacterBaseChatAction,
  type CharacterResult,
} from "@/presentation/actions/characters";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { CharacterImagePreviewDialog } from "@/presentation/components/app/characters/[id]/character-image-preview-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterVersion,
} from "@/presentation/serialize";
import { BLUEPRINT_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";

export function CharacterBaseChatPanel({
  character,
  credits,
  subscribed,
  pending,
  run,
  onClose,
}: {
  character: PublicCharacter;
  credits: number;
  subscribed: boolean;
  pending: string;
  run: (key: string, action: () => Promise<CharacterResult>) => Promise<PublicCharacter | undefined>;
  onClose?: () => void;
}) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const isHans = locale === "zh-Hans";

  const [message, setMessage] = useState("");
  const [attachedUrl, setAttachedUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    title: string;
    alt: string;
  } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatMessages = character.baseChat || [];
  const baseVersion: PublicCharacterVersion | null =
    character.versions.find((v) => v.id === character.baseVersionId) ||
    character.versions.find(
      (v) =>
        !v.parentVersionId &&
        !v.isBaseCandidate &&
        v.status === "completed" &&
        Boolean(v.blueprintUrl),
    ) ||
    character.versions.find(
      (v) => !v.isBaseCandidate && v.status === "completed" && Boolean(v.blueprintUrl),
    ) ||
    null;

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages.length, pending]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await uploadCharacterImageAction(form);
      if (!res.ok || !res.url) {
        setUploadError(translateAppError(res.error || "上傳失敗", t));
        return;
      }
      setAttachedUrl(res.url);
    } catch {
      setUploadError(isEn ? "Failed to upload image" : "圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if ((!trimmed && !attachedUrl) || pending !== "" || uploading) return;
    const sentMsg = trimmed;
    const sentImg = attachedUrl || undefined;
    setMessage("");
    setAttachedUrl("");
    const updated = await run("base-chat-send", () =>
      sendCharacterBaseChatAction({
        characterId: character.id,
        message: sentMsg,
        imageUrl: sentImg,
      }),
    );
    if (!updated) {
      setMessage(sentMsg);
      if (sentImg) setAttachedUrl(sentImg);
    }
  }

  function handleApplyAsBase(versionId: string) {
    void run(`apply-base-${versionId}`, () =>
      applyCharacterBaseVersionAction(character.id, versionId),
    );
  }

  function handleRetryCandidate(versionId: string) {
    void run(`retry-base-${versionId}`, () =>
      retryCharacterVersionAction(character.id, versionId),
    );
  }

  const headerTitle = isEn
    ? "Base Image AI Agent"
    : isHans
      ? "基底图 AI 对话代理"
      : "基底圖 AI 對話代理";
  const headerSub = isEn
    ? "Preview facial, hair, or base look tweaks first — click Apply to update the character's Realistic foundation."
    : isHans
      ? "先在对话中生成基底预览，满意后点击「套用为 Base Image」正式更新角色基底。"
      : "先在對話中生成基底預覽，滿意後點擊「套用為 Base Image」正式更新角色基底。";
  const currentBaseLabel = isEn
    ? "Active Base Foundation"
    : isHans
      ? "目前使用中的 Base Image"
      : "目前使用中的 Base Image";
  const applyBtnLabel = isEn
    ? "Apply as Base Image"
    : isHans
      ? "✓ 套用为 Base Image"
      : "✓ 套用為 Base Image";
  const appliedBadgeLabel = isEn
    ? "✓ Active Base Image"
    : isHans
      ? "✓ 目前使用中的基底"
      : "✓ 目前使用中的基底";
  const placeholderText = isEn
    ? "e.g., Add gold-rimmed glasses, shorter bob hair, warmer smile…"
    : isHans
      ? "例如：加上金丝眼镜、头发剪短到肩膀、笑容更温暖自然…"
      : "例如：加上金絲眼鏡、頭髮剪短到肩膀、笑容更溫暖自然…";

  return (
    <aside className="flex h-full min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/95 shadow-[6px_6px_0_0_rgba(18,20,28,0.06)]">
      {previewImage ? (
        <CharacterImagePreviewDialog
          src={previewImage.src}
          title={previewImage.title}
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
        />
      ) : null}

      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-accent-ink/10 px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-ink text-[11px] font-bold text-lime">
              ✦
            </span>
            <h2 className="font-display text-sm font-bold text-foreground">
              {headerTitle}
            </h2>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-muted">{headerSub}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-xs font-bold text-muted hover:text-foreground"
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Current Active Base Image Banner */}
      {baseVersion?.blueprintUrl ? (
        <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-accent-ink/10 bg-accent-ink/[0.03] px-4 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                setPreviewImage({
                  src: baseVersion.blueprintUrl!,
                  title: `${character.name} · Base Image`,
                  alt: `${character.name} Base Image`,
                })
              }
              className="group relative h-11 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-accent-ink/15 bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  baseVersion.portraitUrl ||
                  baseVersion.blueprintUrl ||
                  baseVersion.profileUrl
                }
                alt=""
                className="h-full w-full object-contain transition group-hover:scale-105"
              />
            </button>
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-accent-ink px-2 py-0.5 text-[10px] font-bold text-lime">
                {currentBaseLabel}
              </span>
              <p className="mt-0.5 truncate text-[11px] text-muted">
                v{baseVersion.number} · Realistic Foundation
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Message List */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3"
        aria-live="polite"
      >
        {chatMessages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-accent-ink/15 bg-paper p-3.5 text-xs leading-5 text-muted">
            <p className="font-semibold text-foreground">
              {isEn
                ? "How Base Image Chat works:"
                : isHans
                  ? "如何使用基底图对话修改："
                  : "如何使用基底圖對話修改："}
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>
                {isEn
                  ? "Describe any change to the character's face, hairstyle, glasses, expression, or base outfit."
                  : isHans
                    ? "输入你想微调的五官、发型、眼镜、表情或基础穿搭。"
                    : "輸入你想微調的五官、髮型、眼鏡、表情或基礎穿搭。"}
              </li>
              <li>
                {isEn
                  ? "A new Realistic Base preview will render here without overwriting your current character yet."
                  : isHans
                    ? "系统会先在此对话中生成新的 Realistic 蓝图预览，不会立刻覆盖现有角色。"
                    : "系統會先在此對話中生成新的 Realistic 藍圖預覽，不會立刻覆蓋現有角色。"}
              </li>
              <li>
                {isEn
                  ? "Click “Apply as Base Image” on any preview you like to make it the new foundation."
                  : isHans
                    ? "预览满意后点击「套用为 Base Image」，即可设为新的唯一基底。"
                    : "預覽滿意後點擊「套用為 Base Image」，即可設為新的唯一基底。"}
              </li>
            </ul>
          </div>
        ) : null}

        {chatMessages.map((msg) => {
          const isUser = msg.role === "user";
          const candidate = msg.candidateVersionId
            ? character.versions.find((v) => v.id === msg.candidateVersionId)
            : undefined;
          const isCurrentBase =
            Boolean(candidate) && character.baseVersionId === candidate?.id;
          const isGenerating =
            candidate?.status === "queued" || candidate?.status === "in_progress";
          const isFailed = candidate?.status === "failed";
          const isCompleted =
            candidate?.status === "completed" && Boolean(candidate.blueprintUrl);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                  isUser
                    ? "bg-accent-ink text-paper"
                    : "border border-accent-ink/12 bg-white text-foreground"
                }`}
              >
                {msg.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={msg.imageUrl}
                    alt=""
                    className="mb-2 max-h-28 rounded-lg border border-white/20 object-contain"
                  />
                ) : null}
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {candidate ? (
                  <div className="mt-2.5 overflow-hidden rounded-xl border border-accent-ink/12 bg-paper p-2 text-foreground">
                    {isGenerating ? (
                      <div className="flex items-center gap-2 py-4 justify-center text-xs text-muted">
                        <Spinner className="h-4 w-4" />
                        <span>
                          {candidate.stage === "fullBody"
                            ? isEn
                              ? "Generating full-body figure (2/2)…"
                              : "正在生成全身圖 (2/2)…"
                            : isEn
                              ? "Generating identity portrait (1/2)…"
                              : "正在生成肖像圖 (1/2)…"}
                        </span>
                      </div>
                    ) : isCompleted ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              src: candidate.blueprintUrl!,
                              title: `${character.name} · Base Preview`,
                              alt: `${character.name} Base Preview`,
                            })
                          }
                          className="group relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-lg border border-accent-ink/10 bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={candidate.blueprintUrl}
                            alt=""
                            className="h-full w-full object-contain transition group-hover:scale-[1.02]"
                          />
                        </button>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-medium text-muted">
                            {candidate.editInstruction || `v${candidate.number}`}
                          </span>
                          {isCurrentBase ? (
                            <span className="shrink-0 rounded-full bg-accent-ink/10 px-2.5 py-1 text-[11px] font-bold text-foreground">
                              {appliedBadgeLabel}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={pending !== ""}
                              onClick={() => handleApplyAsBase(candidate.id)}
                              className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-accent-ink px-3 text-[11px] font-bold text-lime transition hover:-translate-y-0.5 disabled:opacity-50"
                            >
                              {pending === `apply-base-${candidate.id}` ? (
                                <Spinner className="h-3 w-3" />
                              ) : null}
                              <span>{applyBtnLabel}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : isFailed ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                        <span className="text-[11px] font-medium text-accent">
                          {candidate.error
                            ? translateAppError(candidate.error, t)
                            : t("characters.versionFailedFallback")}
                        </span>
                        <button
                          type="button"
                          disabled={pending !== ""}
                          onClick={() => handleRetryCandidate(candidate.id)}
                          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full bg-accent-ink px-2.5 text-[11px] font-bold text-lime disabled:opacity-50"
                        >
                          {pending === `retry-base-${candidate.id}` ? (
                            <Spinner className="h-3 w-3" />
                          ) : null}
                          <span>
                            {t("characters.retryCredits", { cost: BLUEPRINT_COST })}
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {pending === "base-chat-send" ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Spinner className="h-3.5 w-3.5" />
            <span>
              {isEn
                ? "Planning base image update…"
                : isHans
                  ? "AI 正在分析并排程基底蓝图…"
                  : "AI 正在分析並排程基底藍圖…"}
            </span>
          </div>
        ) : null}
      </div>

      {/* Composer */}
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="shrink-0 space-y-2 border-t border-accent-ink/10 bg-paper p-3"
      >
        {attachedUrl ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-accent-ink/15 bg-white px-2.5 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachedUrl}
                alt=""
                className="h-8 w-8 rounded object-cover"
              />
              <span className="truncate text-[11px] text-muted">
                {isEn ? "Reference image attached" : "已附上參考圖片"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedUrl("")}
              className="cursor-pointer text-xs font-bold text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ) : null}

        {uploadError ? (
          <p className="text-[11px] font-medium text-accent">{uploadError}</p>
        ) : null}

        <div className="flex items-end gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => void handleFileChange(event)}
            className="hidden"
          />
          <button
            type="button"
            disabled={pending !== "" || uploading}
            onClick={() => fileInputRef.current?.click()}
            title={isEn ? "Attach reference image" : "附上參考圖片"}
            aria-label={isEn ? "Attach reference image" : "附上參考圖片"}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 bg-white text-xs font-bold text-muted transition hover:border-accent-ink/40 hover:text-foreground disabled:opacity-50"
          >
            {uploading ? <Spinner className="h-3.5 w-3.5" /> : "📷"}
          </button>

          <textarea
            rows={2}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={pending !== ""}
            placeholder={placeholderText}
            className="min-h-[38px] min-w-0 flex-1 resize-none rounded-xl border border-accent-ink/15 bg-white px-3 py-1.5 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={
              (!message.trim() && !attachedUrl) || pending !== "" || uploading
            }
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-accent px-3.5 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "base-chat-send" ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : null}
            <span>
              {isEn
                ? `Send (${BLUEPRINT_COST})`
                : `送出 (${BLUEPRINT_COST}點)`}
            </span>
          </button>
        </div>

        <p className="text-[10px] text-muted">
          {subscribed || credits >= BLUEPRINT_COST
            ? t("characters.costLine", {
                cost: BLUEPRINT_COST,
                remaining: credits,
              })
            : t("characters.subscribeRequired")}
        </p>
      </form>
    </aside>
  );
}
