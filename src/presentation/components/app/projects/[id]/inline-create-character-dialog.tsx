"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createCharacterAction } from "@/presentation/actions/characters";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { CameraCaptureDialog } from "@/presentation/components/app/characters/camera-capture-dialog";
import { CreateCharacterReferences } from "@/presentation/components/app/characters/create-character-references";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StylePicker } from "@/presentation/components/style-picker";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { MAX_CHARACTER_REFERENCES } from "@/service/character/reference-urls";
import { BLUEPRINT_COST } from "@/service/production-plan";
import { pickerDefaultStyleId } from "@/service/style";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 40;
type CreateTab = "image" | "text";

// Inline modal dialog opened from the connected "+ Create" button beside the Character dropdown.
// Features two tabs ("Upload Image" and "Create by Text"), creates the character in MongoDB,
// and immediately returns it to be selected in the dropdown without leaving the Create Video page.
export function InlineCreateCharacterDialog({
  styles,
  defaultStyleId,
  credits = 0,
  subscribed = false,
  onCreated,
  onClose,
}: {
  styles: PublicStyle[];
  defaultStyleId?: string;
  credits?: number;
  subscribed?: boolean;
  onCreated: (character: PublicCharacter) => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [tab, setTab] = useState<CreateTab>("image");
  const [name, setName] = useState("");
  const [styleId, setStyleId] = useState<string>(
    () => defaultStyleId || pickerDefaultStyleId(styles),
  );
  const [prompt, setPrompt] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creditGate, setCreditGate] = useState(false);
  const [paidSnap, setPaidSnap] = useState<{
    credits: number;
    subscribed: boolean;
  } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const walletCredits = paidSnap?.credits ?? credits;
  const walletSubscribed = paidSnap?.subscribed ?? subscribed;

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !creditGate && !cameraOpen && !submitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creditGate, cameraOpen, submitting, onClose]);

  const tabUploadLabel =
    locale === "zh-Hant"
      ? "📷 上傳相片建立 · Upload Image"
      : locale === "zh-Hans"
        ? "📷 上传照片创建 · Upload Image"
        : "📷 Upload Image";

  const tabTextLabel =
    locale === "zh-Hant"
      ? "✍️ 文字描述建立 · Create by Text"
      : locale === "zh-Hans"
        ? "✍️ 文字描述创建 · Create by Text"
        : "✍️ Create by Text";

  const optionalNoteLabel =
    locale === "zh-Hant"
      ? "補充外觀或服裝說明（選填）"
      : locale === "zh-Hans"
        ? "补充外观或服装说明（选填）"
        : "Additional outfit or look notes (Optional)";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    if (tab === "image" && referenceImageUrls.length === 0) {
      setError(
        locale === "zh-Hant"
          ? "請先上傳至少一張參考相片，或切換至「文字描述建立」"
          : locale === "zh-Hans"
            ? "请先上传至少一张参考照片，或切换至“文字描述创建”"
            : "Please upload at least one photo, or switch to “Create by Text”.",
      );
      return;
    }
    if (tab === "text" && !prompt.trim()) {
      setError(
        locale === "zh-Hant"
          ? "請輸入角色外觀與服裝描述"
          : locale === "zh-Hans"
            ? "请输入角色外观与服装描述"
            : "Please enter a character description.",
      );
      return;
    }

    setError("");
    setSubmitting(true);
    const data = new FormData();
    data.set("name", name.trim());
    data.set("styleId", styleId);
    data.set("prompt", prompt.trim());
    if (tab === "image") {
      for (const url of referenceImageUrls) {
        data.append("referenceImageUrl", url);
      }
    }

    try {
      const result = await createCharacterAction(data);
      if (!result.ok) {
        setSubmitting(false);
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) {
          setCreditGate(true);
        }
        return;
      }
      onCreated(result.character);
      onClose();
    } catch {
      setError(t("errors.createCharacterFailed"));
      setSubmitting(false);
    }
  }

  const canSubmit =
    name.trim().length > 0 &&
    (tab === "image"
      ? referenceImageUrls.length > 0
      : prompt.trim().length > 0) &&
    !submitting;

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/45 p-4 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border-2 border-accent-ink bg-paper p-6 shadow-[8px_8px_0_0_#12141c] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-2xl font-bold">
              {t("characters.createSimple")}
            </h2>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              {t("characters.modalIntro")}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher: Upload Image vs Create by Text */}
        <div
          role="tablist"
          aria-label="Character creation method"
          className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl border border-accent-ink/15 bg-white p-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "image"}
            disabled={submitting}
            onClick={() => {
              setError("");
              setTab("image");
            }}
            className={`cursor-pointer rounded-xl px-3 py-2.5 font-display text-xs font-bold transition sm:text-sm ${
              tab === "image"
                ? "bg-accent-ink text-lime shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tabUploadLabel}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "text"}
            disabled={submitting}
            onClick={() => {
              setError("");
              setTab("text");
            }}
            className={`cursor-pointer rounded-xl px-3 py-2.5 font-display text-xs font-bold transition sm:text-sm ${
              tab === "text"
                ? "bg-accent-ink text-lime shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tabTextLabel}
          </button>
        </div>

        <form ref={formRef} onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              {t("characters.nameLabel")}
            </span>
            <input
              ref={inputRef}
              type="text"
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              placeholder={t("characters.namePlaceholder")}
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          {styles.length > 0 ? (
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">
                {t("characters.styleLabel")}
              </legend>
              <StylePicker
                styles={styles}
                value={styleId}
                onChange={setStyleId}
                disabled={submitting}
                label={t("characters.styleLabel")}
              />
            </fieldset>
          ) : null}

          {tab === "image" ? (
            <div className="space-y-4">
              <CreateCharacterReferences
                urls={referenceImageUrls}
                disabled={submitting}
                onChange={setReferenceImageUrls}
                onError={setError}
                onOpenCamera={() => setCameraOpen(true)}
              />
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted">
                  {optionalNoteLabel}
                </span>
                <textarea
                  rows={2}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  disabled={submitting}
                  placeholder={t("characters.describePlaceholder")}
                  className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-white px-4 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                />
              </label>
            </div>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                {t("characters.describeLabel")}
              </span>
              <textarea
                rows={4}
                required
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={submitting}
                placeholder={t("characters.describePlaceholder")}
                className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-white px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              />
            </label>
          )}

          {error ? (
            <p role="alert" className="text-sm font-medium text-accent">
              {translateAppError(error, t)}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-accent-ink/10 pt-4">
            <p className="text-xs text-muted">
              {walletSubscribed || walletCredits >= BLUEPRINT_COST
                ? t("characters.costLine", {
                    cost: BLUEPRINT_COST,
                    remaining: walletCredits,
                  })
                : t("characters.subscribeRequired")}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Spinner className="h-4 w-4" /> : null}
                {t("characters.generateBlueprint")}
              </button>
            </div>
          </div>
        </form>
      </div>

      {cameraOpen ? (
        <CameraCaptureDialog
          remaining={MAX_CHARACTER_REFERENCES - referenceImageUrls.length}
          onClose={() => setCameraOpen(false)}
          onCaptured={(urls) =>
            setReferenceImageUrls([
              ...referenceImageUrls,
              ...urls.filter((url) => !referenceImageUrls.includes(url)),
            ])
          }
        />
      ) : null}

      {creditGate ? (
        <InsufficientCreditsDialog
          needed={BLUEPRINT_COST}
          subscribed={walletSubscribed}
          onClose={() => setCreditGate(false)}
          onPaid={(snap) => {
            setPaidSnap(snap);
            setCreditGate(false);
            formRef.current?.requestSubmit();
          }}
        />
      ) : null}
    </DialogBackdrop>
  );
}
