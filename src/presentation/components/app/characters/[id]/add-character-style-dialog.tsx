"use client";

import { useId, useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { addCharacterStyleAction } from "@/presentation/actions/characters";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import { FRAME_COST } from "@/service/production-plan";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { localizedStyleName } from "@/util/style-i18n";
import type { StyleId } from "@/model/style-id";
import { isStyleId } from "@/model/style-id";

function styleName(style: PublicStyle) {
  return style.isCustom || !isStyleId(style.id) ? style.name : localizedStyleName(style.id as StyleId);
}

// Pick a style and start a blueprint from the character's original photos.
export function AddCharacterStyleDialog({
  character,
  styles,
  onClose,
  onAdded,
  onNeedCredits,
}: {
  character: PublicCharacter;
  styles: PublicStyle[];
  onClose: () => void;
  onAdded: (character: PublicCharacter, styleId: string) => void;
  onNeedCredits: (styleId: string) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const available = styles.filter((style) => !character.styleIds.includes(style.id));
  const [styleId, setStyleId] = useState(available[0]?.id ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    if (!styleId || pending) return;
    setPending(true);
    setError("");
    const result = await addCharacterStyleAction(character.id, styleId);
    setPending(false);
    if (!result.ok) {
      if (isCreditGateError(result.error)) {
        onNeedCredits(styleId);
        return;
      }
      setError(translateAppError(result.error, t));
      return;
    }
    onAdded(result.character, styleId);
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={pending ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(46rem,calc(100vh-2rem))] w-full max-w-4xl flex-col rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {t("characters.addStyleTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{t("characters.addStyleBody")}</p>
        <ul className="mt-4 grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
          {available.length === 0 ? (
            <li className="col-span-full text-sm text-muted">{t("characters.addStyleEmpty")}</li>
          ) : (
            available.map((style) => {
              const selected = style.id === styleId;
              const name = styleName(style);
              return (
                <li key={style.id}>
                  <button
                    type="button"
                    onClick={() => setStyleId(style.id)}
                    aria-pressed={selected}
                    aria-label={name}
                    className={`flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 text-left transition ${
                      selected
                        ? "border-accent-ink"
                        : "border-transparent hover:border-accent-ink/25"
                    }`}
                  >
                    <span
                      className="relative aspect-video w-full overflow-hidden bg-white"
                      style={{ backgroundColor: style.canvasColor }}
                    >
                      {style.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={style.previewUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center px-2 text-center text-xs font-bold text-accent-ink/60">
                          {name}
                        </span>
                      )}
                    </span>
                    <span className="truncate px-1.5 py-1.5 text-xs font-semibold">{name}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-accent">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={pending || !styleId}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 text-sm font-semibold text-paper shadow-[3px_3px_0_0_rgba(18,20,28,0.15)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {t("characters.addStyleSubmit", { cost: FRAME_COST })}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
