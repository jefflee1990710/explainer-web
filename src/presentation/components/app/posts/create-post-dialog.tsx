"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { createPostAction } from "@/presentation/actions/posts";
import { CharacterPicker } from "@/presentation/components/app/projects/[id]/character-picker";
import { ProductPicker } from "@/presentation/components/app/products/product-picker";
import { StylePicker } from "@/presentation/components/style-picker";
import { INSTRUCTION_MAX, type PosterLayoutId } from "@/model/post-layers";
import { DEFAULT_STYLE_ID } from "@/service/style";
import type { PublicCharacter, PublicProduct, PublicStyle } from "@/presentation/serialize";

export type PosterLayoutChoice = {
  id: PosterLayoutId;
  blueprintPath: string;
};

// Pick one of the 16 layouts and describe the poster.
export function CreatePostDialog({
  layouts,
  styles,
  characters,
  products,
  onClose,
}: {
  layouts: PosterLayoutChoice[];
  styles: PublicStyle[];
  characters: PublicCharacter[];
  products: PublicProduct[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const titleId = useId();
  const [layoutId, setLayoutId] = useState<PosterLayoutId>("layout-01");
  const [styleId, setStyleId] = useState<string>(DEFAULT_STYLE_ID);
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await createPostAction(layoutId, instruction, {
      styleId,
      characterIds,
      productIds,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(t(`post.error.${result.error}`));
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <DialogBackdrop className="grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void onSubmit(event)}
        className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-2xl font-bold">
            {t("post.create.title")}
          </h2>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-sm font-semibold"
            onClick={onClose}
          >
            {t("post.create.close")}
          </button>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">{t("post.create.layoutLabel")}</legend>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {layouts.map((layout, index) => {
              const selected = layout.id === layoutId;
              return (
                <button
                  key={layout.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={t("post.create.layoutOption", { n: index + 1 })}
                  onClick={() => setLayoutId(layout.id)}
                  className={`min-h-11 cursor-pointer overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] ${
                    selected ? "border-[var(--studio-ink)]" : "border-transparent"
                  }`}
                >
                  {/* Blueprint is the layout choice itself. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={layout.blueprintPath} alt="" className="aspect-[2/3] w-full object-cover" />
                </button>
              );
            })}
          </div>
        </fieldset>
        <p className="mt-5 text-sm font-semibold">{t("post.create.styleLabel")}</p>
        <div className="mt-3">
          <StylePicker
            styles={styles}
            value={styleId}
            disabled={submitting}
            onChange={(id) => {
              setStyleId(id);
              setCharacterIds((ids) =>
                ids.filter((characterId) => {
                  const character = characters.find((item) => item.id === characterId);
                  const styleIds = character?.styleIds?.length ? character.styleIds : [character?.styleId];
                  return styleIds.includes(id);
                }),
              );
            }}
          />
        </div>
        <p className="mt-5 text-sm font-semibold">{t("post.create.castLabel")}</p>
        <p className="mt-1 text-xs text-muted">{t("post.create.castHint")}</p>
        <div className="mt-3">
          <CharacterPicker
            characters={characters}
            styleId={styleId}
            value={characterIds}
            onChange={setCharacterIds}
            disabled={submitting}
          />
        </div>
        <p className="mt-5 text-sm font-semibold">{t("post.create.productLabel")}</p>
        <p className="mt-1 text-xs text-muted">{t("post.create.productHint")}</p>
        <div className="mt-3">
          <ProductPicker products={products} value={productIds} onChange={setProductIds} disabled={submitting} />
        </div>
        <label className="mt-5 block text-sm font-semibold">
          {t("post.create.instructionLabel")}
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            maxLength={INSTRUCTION_MAX}
            required
            rows={4}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--studio-line)] px-3 py-3 text-base font-normal"
          />
          <span className="mt-1 block font-normal text-muted">{t("post.create.instructionHint")}</span>
        </label>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--studio-ink)] px-5 text-sm font-semibold text-[var(--studio-teal)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t("post.create.submitting") : t("post.create.submit")}
        </button>
      </form>
    </DialogBackdrop>
  );
}
