"use client";

import { useRef, useState } from "react";
import { createCharacterAction } from "@/presentation/actions/characters";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { CameraCaptureDialog } from "@/presentation/components/app/characters/camera-capture-dialog";
import { CreateCharacterReferences } from "@/presentation/components/app/characters/create-character-references";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { MAX_CHARACTER_REFERENCES } from "@/service/character/reference-urls";
import { BLUEPRINT_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 40;
type CreateTab = "image" | "text";

// Inline photo-or-text creator for the home AI Influencer Studio panel.
export function HomeInfluencerCreateForm({
  credits = 0,
  subscribed = false,
  onCreated,
}: {
  credits?: number;
  subscribed?: boolean;
  onCreated: (character: PublicCharacter) => void;
}) {
  const { t, locale } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [tab, setTab] = useState<CreateTab>("image");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creditGate, setCreditGate] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [paidSnap, setPaidSnap] = useState<{
    credits: number;
    subscribed: boolean;
  } | null>(null);

  const walletCredits = paidSnap?.credits ?? credits;
  const walletSubscribed = paidSnap?.subscribed ?? subscribed;
  const photoTab =
    locale === "zh-Hant" ? "上傳相片" : locale === "zh-Hans" ? "上传照片" : "Photo";
  const textTab =
    locale === "zh-Hant" ? "文字描述" : locale === "zh-Hans" ? "文字描述" : "Text";

  const canSubmit =
    name.trim().length > 0 &&
    (tab === "image" ? referenceImageUrls.length > 0 : prompt.trim().length > 0) &&
    !submitting;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    if (tab === "image" && referenceImageUrls.length === 0) {
      setError(
        locale === "zh-Hant"
          ? "請先上傳至少一張參考相片，或改用文字描述"
          : locale === "zh-Hans"
            ? "请先上传至少一张参考照片，或改用文字描述"
            : "Upload at least one photo, or switch to text.",
      );
      return;
    }
    if (tab === "text" && !prompt.trim()) {
      setError(
        locale === "zh-Hant"
          ? "請輸入角色外觀與服裝描述"
          : locale === "zh-Hans"
            ? "请输入角色外观与服装描述"
            : "Describe the character's look.",
      );
      return;
    }

    setError("");
    setSubmitting(true);
    const data = new FormData();
    data.set("name", name.trim());
    data.set("styleId", "realistic");
    data.set("prompt", prompt.trim());
    if (tab === "image") {
      for (const url of referenceImageUrls) data.append("referenceImageUrl", url);
    }

    try {
      const result = await createCharacterAction(data);
      if (!result.ok) {
        setSubmitting(false);
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) setCreditGate(true);
        return;
      }
      onCreated(result.character);
    } catch {
      setError(t("errors.createCharacterFailed"));
      setSubmitting(false);
    }
  }

  return (
    <>
      <form
        ref={formRef}
        onSubmit={(event) => void onSubmit(event)}
        className="mt-5 rounded-xl border border-[var(--studio-line)] bg-[var(--studio-fill)]/70 p-4"
      >
        <div
          role="tablist"
          aria-label="Character creation method"
          className="grid w-full max-w-xs grid-cols-2 gap-1 rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-1"
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
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold ${
              tab === "image"
                ? "bg-[#c6f24b] text-[#12141c]"
                : "text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
            }`}
          >
            {photoTab}
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
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold ${
              tab === "text"
                ? "bg-[#c6f24b] text-[#12141c]"
                : "text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
            }`}
          >
            {textTab}
          </button>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--studio-ink)]">
              {t("characters.nameLabel")}
            </span>
            <input
              type="text"
              required
              maxLength={NAME_MAX}
              value={name}
              disabled={submitting}
              placeholder={t("characters.namePlaceholder")}
              onChange={(event) => setName(event.target.value)}
              className="min-h-10 w-full rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] px-3 text-sm text-[var(--studio-ink)] outline-none placeholder:text-[var(--studio-muted)] focus:border-[#c6f24b] disabled:opacity-60"
            />
          </label>

          {tab === "image" ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--studio-muted)]">
                {locale === "zh-Hant"
                  ? "補充外觀或服裝說明（選填）"
                  : locale === "zh-Hans"
                    ? "补充外观或服装说明（选填）"
                    : "Outfit or look notes (optional)"}
              </span>
              <input
                type="text"
                value={prompt}
                disabled={submitting}
                placeholder={t("characters.describePlaceholder")}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-10 w-full rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] px-3 text-sm text-[var(--studio-ink)] outline-none placeholder:text-[var(--studio-muted)] focus:border-[#c6f24b] disabled:opacity-60"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--studio-ink)]">
                {locale === "zh-Hant"
                  ? "外觀與服裝"
                  : locale === "zh-Hans"
                    ? "外观与服装"
                    : "Look"}
              </span>
              <textarea
                rows={2}
                required
                value={prompt}
                disabled={submitting}
                placeholder={t("characters.describePlaceholder")}
                onChange={(event) => setPrompt(event.target.value)}
                className="w-full resize-y rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] px-3 py-2 text-sm leading-5 text-[var(--studio-ink)] outline-none placeholder:text-[var(--studio-muted)] focus:border-[#c6f24b] disabled:opacity-60"
              />
            </label>
          )}
        </div>

        {tab === "image" ? (
          <div className="mt-3">
            <CreateCharacterReferences
              urls={referenceImageUrls}
              disabled={submitting}
              onChange={setReferenceImageUrls}
              onError={setError}
              onOpenCamera={() => setCameraOpen(true)}
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-red-300">
            {translateAppError(error, t)}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--studio-muted)]">
            {walletSubscribed || walletCredits >= BLUEPRINT_COST
              ? t("characters.costLine", { cost: BLUEPRINT_COST, remaining: walletCredits })
              : t("characters.subscribeRequired")}
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#c6f24b] px-4 py-2 font-display text-xs font-extrabold text-[#12141c] transition hover:bg-[#b6e23a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Spinner className="h-3.5 w-3.5" /> : null}
            {t("characters.generateBlueprint")}
          </button>
        </div>
      </form>

      {cameraOpen ? (
        <CameraCaptureDialog
          remaining={MAX_CHARACTER_REFERENCES - referenceImageUrls.length}
          onClose={() => setCameraOpen(false)}
          onCaptured={(urls) =>
            setReferenceImageUrls((current) => [
              ...current,
              ...urls.filter((url) => !current.includes(url)),
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
    </>
  );
}
