"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { CharacterLookArt } from "@/presentation/components/app/characters/character-look-art";
import { CharacterLookDialog } from "@/presentation/components/app/characters/character-look-dialog";
import { useCustomWardrobeItems } from "@/presentation/components/app/characters/use-custom-wardrobe-items";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacterVersion } from "@/presentation/serialize";
import {
  applyWardrobePick,
  CHARACTER_WARDROBE_PARTS,
  characterWardrobeEditInstruction,
  defaultCharacterLook,
  detectCharacterWardrobePicks,
  isExaggeratedLookOption,
  type CharacterWardrobePart,
  type CharacterWardrobePicks,
} from "@/service/character/character-look";
import {
  detectCharacterWardrobeColors,
  mergeWardrobePicksForColorEdits,
  type CharacterWardrobeColorPicks,
} from "@/service/character/wardrobe-colors";
import { WardrobePartColorPicker } from "@/presentation/components/app/characters/wardrobe-part-color-picker";

// Left column: hair / top / pants / shoes / accessory pickers stacked top to bottom, a free-text note, and Generate at the bottom.
export function RoomWardrobePanel({
  version,
  cost,
  credits,
  subscribed,
  pending,
  onEdit,
}: {
  version: PublicCharacterVersion;
  cost: number;
  credits: number;
  subscribed: boolean;
  pending: string;
  onEdit: (instruction: string) => void;
}) {
  const { t, locale } = useI18n();
  const formId = useId();
  const [instruction, setInstruction] = useState("");
  const [picks, setPicks] = useState<CharacterWardrobePicks>({});
  const [colors, setColors] = useState<CharacterWardrobeColorPicks>({});
  const [dialogPart, setDialogPart] = useState<CharacterWardrobePart | null>(null);
  const { byOptionId, promptMap } = useCustomWardrobeItems();
  const ready = version.status === "completed";
  const locked = !ready || pending !== "";
  const short = credits < cost;
  const versionText = [version.prompt, version.editInstruction].filter(Boolean).join("\n");
  const current = detectCharacterWardrobePicks(versionText);
  const wornColors = detectCharacterWardrobeColors(versionText);
  const mergedPicks = mergeWardrobePicksForColorEdits(picks, colors, current, promptMap);
  const composedEdit = characterWardrobeEditInstruction(
    mergedPicks,
    instruction,
    current.top,
    promptMap,
    colors,
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!composedEdit || locked) return;
    onEdit(composedEdit);
    setInstruction("");
    setPicks({});
    setColors({});
  }

  return (
    <form
      id={formId}
      onSubmit={submit}
      aria-label={t("characters.roomWardrobeHeading")}
      className="flex min-h-0 flex-col gap-2 overflow-hidden bg-[var(--studio-panel)] p-3 lg:h-full"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
          {t("characters.roomWardrobeHeading")}
        </span>
        <Link
          href="/app/wardrobe"
          className="text-[11px] font-bold text-accent hover:underline"
        >
          {t("wardrobe.openLibrary")}
        </Link>
      </div>

      <div className="min-h-0 min-w-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto pr-0.5">
        {CHARACTER_WARDROBE_PARTS.map((part) => {
          const pickedId = picks[part];
          const activeId = pickedId ?? current[part];
          const thumbId = activeId ?? defaultCharacterLook()[part] ?? "";
          const partLabel = t(`characters.look.${part}`);
          const customOption = activeId?.startsWith("cw_") ? byOptionId.get(activeId) : undefined;
          const optionName = customOption
            ? locale === "en"
              ? customOption.name
              : customOption.nameZh || customOption.name
            : activeId
              ? t(`characters.look.options.${part}.${activeId}`)
              : "—";
          const extreme = activeId && !customOption ? isExaggeratedLookOption(part, activeId) : false;
          const colorActiveId = activeId ?? defaultCharacterLook()[part];
          return (
            <div key={part} className="space-y-1">
            <div className="relative flex items-center">
              <button
                type="button"
                disabled={locked}
                onClick={() => setDialogPart(part)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border p-2 text-left transition ${
                  pickedId
                    ? "border-accent bg-accent/8 shadow-[2px_2px_0_0_#12141c]"
                    : "border-accent-ink/10 bg-paper hover:border-accent-ink/30"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-200 ${activeId ? "" : "opacity-65"}`}>
                  <CharacterLookArt part={part} id={thumbId} />
                  {extreme ? (
                    <span className="absolute top-0.5 left-0.5 rounded bg-accent-ink px-1 text-[8px] font-extrabold text-paper">!</span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 pr-5">
                  <span className="block text-[10px] font-semibold text-muted">{partLabel}</span>
                  <span className="block truncate text-xs font-bold">{optionName}</span>
                </span>
              </button>
              {pickedId ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() =>
                    setPicks((prev) => {
                      const next = { ...prev };
                      delete next[part];
                      return next;
                    })
                  }
                  aria-label={`${partLabel} reset`}
                  className="absolute right-2 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-accent-ink/10 text-[11px] font-bold text-muted transition hover:bg-accent-ink hover:text-paper"
                >
                  ×
                </button>
              ) : null}
            </div>
            {colorActiveId ? (
              <WardrobePartColorPicker
                compact
                part={part}
                optionId={colorActiveId}
                customPrompt={customOption?.prompt}
                inheritedColor={wornColors[part]}
                value={colors}
                disabled={locked}
                onChange={(next) => {
                  setColors(next);
                  if (next[part] && activeId && !picks[part]) {
                    setPicks((prev) => ({ ...prev, [part]: activeId }));
                  }
                }}
              />
            ) : null}
            </div>
          );
        })}
      </div>

      {/* Bottom dock: free-text note, credits line, Generate. */}
      <div className="shrink-0 space-y-2 border-t border-accent-ink/10 pt-2.5">
        <label className="block">
          <span className="text-xs font-semibold">{t("characters.editWhatLabel")}</span>
          <textarea
            rows={2}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            disabled={locked}
            placeholder={t("characters.editWhatPlaceholder")}
            className="mt-1 w-full resize-none rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          />
        </label>
        <p className="text-[11px] text-muted">
          {!ready
            ? t("characters.roomWardrobeWaiting")
            : short
              ? subscribed
                ? t("characters.creditsShortSubscribed", { remaining: credits })
                : t("characters.creditsNeedSubscribe")
              : t("characters.creditsRemaining", { remaining: credits })}
        </p>
        <button
          type="submit"
          form={formId}
          disabled={!composedEdit || locked}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending === "edit" ? <Spinner className="h-4 w-4" /> : null}
          {t("characters.generateNewVersion", { cost })}
        </button>
      </div>

      {dialogPart ? (
        <CharacterLookDialog
          part={dialogPart}
          value={picks[dialogPart] ?? current[dialogPart] ?? defaultCharacterLook()[dialogPart] ?? ""}
          onChange={(id) => {
            setPicks((prev) => applyWardrobePick(prev, dialogPart, id, current));
            setColors((prev) => {
              const next = { ...prev };
              delete next[dialogPart];
              return next;
            });
          }}
          onClose={() => setDialogPart(null)}
        />
      ) : null}
    </form>
  );
}
