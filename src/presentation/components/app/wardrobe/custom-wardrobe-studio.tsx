"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { PublicCustomWardrobeItem } from "@/model/custom-wardrobe-item";
import {
  analyzeCustomWardrobeImageAction,
  createCustomWardrobeItemAction,
  deleteCustomWardrobeItemAction,
} from "@/presentation/actions/custom-wardrobe";
import { notifyCustomWardrobeChanged } from "@/presentation/components/app/characters/use-custom-wardrobe-items";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import {
  CHARACTER_WARDROBE_PARTS,
  type CharacterLookCategory,
  type CharacterWardrobePart,
} from "@/service/character/character-look";

const CATEGORY_KEYS: Record<
  Exclude<CharacterLookCategory, "all">,
  "wardrobe.categoryClassic" | "wardrobe.categoryStylized" | "wardrobe.categoryExtreme"
> = {
  classic: "wardrobe.categoryClassic",
  stylized: "wardrobe.categoryStylized",
  extreme: "wardrobe.categoryExtreme",
};

export function CustomWardrobeStudio({
  initialItems,
  initialPart = "top",
}: {
  initialItems: PublicCustomWardrobeItem[];
  initialPart?: CharacterWardrobePart;
}) {
  const { t, locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PublicCustomWardrobeItem[]>(initialItems);
  const [part, setPart] = useState<CharacterWardrobePart>(initialPart);
  const [category, setCategory] = useState<Exclude<CharacterLookCategory, "all">>("stylized");
  const [nameZh, setNameZh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [prompt, setPrompt] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [localPreview, setLocalPreview] = useState("");
  const [generateStudioPreview, setGenerateStudioPreview] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [filterPart, setFilterPart] = useState<CharacterWardrobePart | "all">("all");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function updateItemsList(next: PublicCustomWardrobeItem[]) {
    setItems(next);
    notifyCustomWardrobeChanged(next);
  }

  function displayItemName(item: PublicCustomWardrobeItem): string {
    if (locale === "zh-Hant" || locale === "zh-Hans") {
      return item.nameZh || item.name;
    }
    return item.name || item.nameZh;
  }

  async function onFileSelected(file: File | undefined) {
    if (!file) return;
    setError("");
    setSuccessMsg("");
    setLocalPreview(URL.createObjectURL(file));
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("part", part);
      const res = await analyzeCustomWardrobeImageAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPart(res.part);
      setCategory(res.category);
      setNameEn(res.nameEn);
      setNameZh(res.nameZh);
      setPrompt(res.prompt);
      setReferenceImageUrl(res.referenceImageUrl);
    } catch {
      setError(t("wardrobe.analyzeError"));
    } finally {
      setAnalyzing(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!referenceImageUrl || saving || analyzing) return;
    setError("");
    setSuccessMsg("");
    setSaving(true);
    try {
      const res = await createCustomWardrobeItemAction({
        part,
        category,
        name: (nameEn || nameZh).trim(),
        nameZh: (nameZh || nameEn).trim(),
        prompt,
        referenceImageUrl,
        generateStudioPreview,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const next = [res.item, ...items];
      updateItemsList(next);
      setNameZh("");
      setNameEn("");
      setPrompt("");
      setReferenceImageUrl("");
      setLocalPreview("");
      setSuccessMsg(
        t("wardrobe.addedSuccess", {
          name: displayItemName(res.item),
        }),
      );
    } catch {
      setError(t("wardrobe.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    setError("");
    try {
      const res = await deleteCustomWardrobeItemAction(id);
      if (!res.ok) {
        setError(res.error || t("wardrobe.deleteError"));
        return;
      }
      updateItemsList(items.filter((item) => item.id !== id));
    } finally {
      setDeletingId("");
    }
  }

  const filteredItems =
    filterPart === "all"
      ? items
      : items.filter((item) => item.part === filterPart);

  // Wardrobe studio fills the main pane on wide screens.
  return (
    <div className="flex w-full max-w-none flex-col gap-6 pb-10">
      {/* Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-ink/10 bg-paper/90 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent-ink px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-lime uppercase">
              {t("wardrobe.badge")}
            </span>
            <h1 className="font-display text-xl font-bold sm:text-2xl">
              {t("wardrobe.title")}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            {t("wardrobe.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/room"
            className="inline-flex h-9 items-center rounded-full border border-accent-ink/20 bg-paper px-4 text-xs font-bold text-foreground transition hover:border-accent-ink"
          >
            {t("wardrobe.openRoom")}
          </Link>
          <Link
            href="/app/life"
            className="inline-flex h-9 items-center rounded-full bg-accent-ink px-4 text-xs font-bold text-lime transition hover:-translate-y-0.5"
          >
            {t("wardrobe.openLife")}
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start">
        {/* Left Column: Upload & AI Extraction Form */}
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-accent-ink/10 bg-paper p-5 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)]"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("wardrobe.step1")}
            </span>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {CHARACTER_WARDROBE_PARTS.map((p) => {
                const active = part === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPart(p)}
                    className={`cursor-pointer rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition ${
                      active
                        ? "border-accent bg-accent-ink text-lime shadow-[2px_2px_0_0_#12141c]"
                        : "border-accent-ink/12 bg-paper text-foreground hover:border-accent-ink/35"
                    }`}
                  >
                    {t(`characters.look.${p}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image Upload Dropzone */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("wardrobe.step2")}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => void onFileSelected(event.target.files?.[0])}
            />
            <div
              onClick={() => !analyzing && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!analyzing) void onFileSelected(e.dataTransfer.files?.[0]);
              }}
              className="mt-2 flex min-h-[13rem] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-accent-ink/20 bg-zinc-50 p-4 text-center transition hover:border-accent-ink/50"
            >
              {localPreview || referenceImageUrl ? (
                <div className="relative h-44 w-44 overflow-hidden rounded-xl border border-accent-ink/10 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={localPreview || referenceImageUrl}
                    alt="Uploaded reference"
                    className="h-full w-full object-cover"
                  />
                  {analyzing ? (
                    <div className="absolute inset-0 grid place-items-center bg-black/55 text-xs font-bold text-white">
                      <div className="flex flex-col items-center gap-2">
                        <Spinner className="h-5 w-5" />
                        <span>{t("wardrobe.analyzing")}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-ink/8 text-lg font-bold">
                    ＋
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {t("wardrobe.dropzoneTitle")}
                  </p>
                  <p className="text-[11px] text-muted">
                    {t("wardrobe.dropzoneHint")}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Extracted Metadata Fields */}
          <div className="space-y-3 border-t border-accent-ink/10 pt-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("wardrobe.step3")}
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="text-[11px] font-semibold text-muted">
                  {t("wardrobe.nameZhLabel")}
                </span>
                <input
                  type="text"
                  required
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  placeholder={t("wardrobe.nameZhPlaceholder")}
                  className="mt-1 h-9 w-full rounded-xl border border-accent-ink/15 bg-white px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-accent"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-muted">
                  {t("wardrobe.nameEnLabel")}
                </span>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder={t("wardrobe.nameEnPlaceholder")}
                  className="mt-1 h-9 w-full rounded-xl border border-accent-ink/15 bg-white px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-accent"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold text-muted">
                {t("wardrobe.categoryLabel")}
              </span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Exclude<CharacterLookCategory, "all">)
                }
                className="mt-1 h-9 w-full rounded-xl border border-accent-ink/15 bg-white px-3 text-xs font-semibold"
              >
                {(["classic", "stylized", "extreme"] as const).map((catId) => (
                  <option key={catId} value={catId}>
                    {t(CATEGORY_KEYS[catId])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-muted">
                {t("wardrobe.promptLabel")}
              </span>
              <textarea
                rows={3}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t("wardrobe.promptPlaceholder")}
                className="mt-1 w-full rounded-xl border border-accent-ink/15 bg-white p-2.5 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-accent"
              />
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={generateStudioPreview}
                onChange={(e) => setGenerateStudioPreview(e.target.checked)}
                className="h-4 w-4 rounded accent-accent-ink"
              />
              <span>{t("wardrobe.studioPreviewCheck")}</span>
            </label>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}
          {successMsg ? (
            <p className="rounded-xl bg-lime/25 px-3 py-2 text-xs font-bold text-accent-ink">
              {successMsg}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!referenceImageUrl || !prompt.trim() || !(nameZh.trim() || nameEn.trim()) || analyzing || saving}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Spinner className="h-4 w-4" /> : null}
            {saving ? t("wardrobe.submitSaving") : t("wardrobe.submitIdle")}
          </button>
        </form>

        {/* Right Column: User's Custom Wardrobe Library */}
        <section className="flex flex-col gap-4 rounded-2xl border border-accent-ink/10 bg-paper/90 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent-ink/10 pb-3">
            <div>
              <h2 className="font-display text-lg font-bold">
                {t("wardrobe.libraryHeading", { count: items.length })}
              </h2>
              <p className="text-xs text-muted">
                {t("wardrobe.librarySubtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterPart("all")}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                  filterPart === "all"
                    ? "bg-accent-ink text-paper"
                    : "border border-accent-ink/15 bg-paper text-muted hover:text-foreground"
                }`}
              >
                {t("wardrobe.filterAll", { count: items.length })}
              </button>
              {CHARACTER_WARDROBE_PARTS.map((p) => {
                const count = items.filter((item) => item.part === p).length;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilterPart(p)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                      filterPart === p
                        ? "bg-accent-ink text-paper"
                        : "border border-accent-ink/15 bg-paper text-muted hover:text-foreground"
                    }`}
                  >
                    {t(`characters.look.${p}`)} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="grid min-h-[18rem] place-items-center rounded-2xl border border-dashed border-accent-ink/15 p-8 text-center">
              <div className="max-w-sm space-y-1.5">
                <p className="text-sm font-bold text-foreground">
                  {t("wardrobe.emptyTitle")}
                </p>
                <p className="text-xs text-muted">
                  {t("wardrobe.emptyBody")}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredItems.map((item) => {
                const primaryName = displayItemName(item);
                const secondaryName =
                  locale === "zh-Hant" || locale === "zh-Hans" ? item.name : item.nameZh;
                return (
                  <article
                    key={item.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-accent-ink/12 bg-paper p-2 transition hover:border-accent-ink/35"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewImageUrl}
                        alt={primaryName}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-accent-ink/85 px-2 py-0.5 text-[10px] font-bold text-lime">
                        {t(`characters.look.${item.part}`)}
                      </span>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => void onDelete(item.id)}
                        aria-label={t("wardrobe.deleteAria", { name: primaryName })}
                        className="absolute top-1.5 right-1.5 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-black/65 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600 disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-2 min-w-0 flex-1 px-0.5">
                      <p className="truncate text-xs font-bold text-foreground">
                        {primaryName}
                      </p>
                      {secondaryName && secondaryName !== primaryName ? (
                        <p className="truncate text-[10px] font-medium text-muted">
                          {secondaryName}
                        </p>
                      ) : null}
                      <p className="mt-1 line-clamp-2 text-[10px] leading-3.5 text-muted">
                        {item.prompt.replace(/\s*Isolated wardrobe piece [\w-]+\.?/g, "")}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
