"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { refreshCharacterAction } from "@/presentation/actions/characters";
import { castPickStatus } from "@/presentation/components/app/projects/[id]/cast-pick-status";
import { CharacterManageDialog } from "@/presentation/components/app/projects/[id]/character-manage-dialog";
import {
  CharacterSelectDialog,
  defaultSheetForStyle,
} from "@/presentation/components/app/projects/[id]/character-select-dialog";
import { InlineCreateCharacterDialog } from "@/presentation/components/app/projects/[id]/inline-create-character-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import type { CharacterSelectionMap } from "@/service/character/character-presets";
import { localizedStyleName } from "@/util/style-i18n";

// Clickable trigger that opens the Character & Preset Selection Dialog, with a connected "+ Create" button on the right.
export function CharacterPicker({
  characters: initialCharacters,
  styles = [],
  styleId,
  value,
  onChange,
  onSelectStyle,
  onCharacterCreated,
  selections: controlledSelections,
  onSelectionsChange,
  credits = 0,
  subscribed = false,
  disabled,
  max = 4,
  required = 0,
}: {
  characters: PublicCharacter[];
  styles?: PublicStyle[];
  styleId?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  onSelectStyle?: (styleId: string) => void;
  onCharacterCreated?: (created: PublicCharacter) => void;
  selections?: CharacterSelectionMap;
  onSelectionsChange?: (next: CharacterSelectionMap) => void;
  credits?: number;
  subscribed?: boolean;
  disabled?: boolean;
  max?: number;
  required?: number;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdCharacters, setCreatedCharacters] = useState<PublicCharacter[]>([]);
  const [overrides, setOverrides] = useState<Record<string, PublicCharacter>>(
    {},
  );

  const characters = useMemo(() => {
    const merged = [...initialCharacters];
    for (const item of createdCharacters) {
      if (!merged.some((existing) => existing.id === item.id)) {
        merged.unshift(item);
      }
    }
    return merged.map((c) => overrides[c.id] ?? c);
  }, [initialCharacters, createdCharacters, overrides]);

  // Poll any newly created or selected character whose blueprint is still generating.
  useEffect(() => {
    const generatingIds = characters
      .filter((c) =>
        c.versions.some(
          (v) => v.status === "queued" || v.status === "in_progress",
        ),
      )
      .map((c) => c.id);
    if (generatingIds.length === 0) return;

    const timer = window.setInterval(() => {
      for (const id of generatingIds) {
        void refreshCharacterAction(id).then((res) => {
          if (res.ok) {
            setOverrides((prev) => ({ ...prev, [res.character.id]: res.character }));
          }
        });
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [characters]);

  const [managingCharId, setManagingCharId] = useState<string | null>(null);
  const [internalSelections, setInternalSelections] =
    useState<CharacterSelectionMap>({});
  const selections = controlledSelections ?? internalSelections;
  const setSelections = onSelectionsChange ?? setInternalSelections;
  const allowNone = required === 0;
  const multiple = max > 1;

  const anyReady = characters.some((character) => character.previewUrl);
  const ready = characters.filter((character) => {
    const charStyles = character.styleIds?.length
      ? character.styleIds
      : [character.styleId];
    const sheet = blueprintForStyle(character, styleId);
    const isJustCreatedAndSelected =
      value.includes(character.id) &&
      (!styleId || charStyles.includes(styleId));
    return (
      (Boolean(sheet) || isJustCreatedAndSelected) &&
      (!styleId || charStyles.includes(styleId))
    );
  });
  const selected = ready.filter((character) => value.includes(character.id));
  const pick = castPickStatus(value.length, required, max, t);

  const createBtnLabel =
    locale === "zh-Hant"
      ? "+ 新增"
      : locale === "zh-Hans"
        ? "+ 新建"
        : "+ Create";

  const handleCreatedCharacter = (created: PublicCharacter) => {
    setCreatedCharacters((prev) => [created, ...prev]);
    setOverrides((prev) => ({ ...prev, [created.id]: created }));
    onCharacterCreated?.(created);
    if (styleId && created.styleId && created.styleId !== styleId && onSelectStyle) {
      onSelectStyle(created.styleId);
    }
    if (!multiple) {
      onChange([created.id]);
      setSelections({});
    } else {
      const nextIds = value.includes(created.id)
        ? value
        : value.length < max
          ? [...value, created.id]
          : [...value.slice(0, max - 1), created.id];
      onChange(nextIds);
    }
  };

  if (required > 0 && ready.length < required) {
    // Collect styles where the user already has enough ready characters so they can unblock Step 01 in one click.
    const countByStyle = new Map<string, number>();
    for (const character of characters) {
      if (!character.previewUrl) continue;
      const charStyles = character.styleIds?.length
        ? character.styleIds
        : [character.styleId];
      for (const sid of charStyles) {
        if (blueprintForStyle(character, sid)) {
          countByStyle.set(sid, (countByStyle.get(sid) ?? 0) + 1);
        }
      }
    }
    const availableStyleIds = Array.from(countByStyle.entries())
      .filter(([sid, count]) => sid !== styleId && count >= required)
      .map(([sid]) => sid)
      .slice(0, 5);

    const switchHint =
      locale === "zh-Hant"
        ? "或一鍵切換至已有現成角色的風格："
        : locale === "zh-Hans"
          ? "或一键切换至已有现成角色的风格："
          : "Or switch to a style with ready characters:";

    return (
      <div className="space-y-2.5">
        <div className="character-split-control flex items-stretch">
          <div className="flex min-h-[4.5rem] min-w-0 flex-1 items-center rounded-l-xl border border-r-0 border-accent-ink/15 bg-paper/70 px-3 py-2.5">
            <p className="text-xs font-medium text-accent sm:text-sm">
              {ready.length === 0
                ? anyReady
                  ? t("brief.castPicker.errorNoStyleCharacters")
                  : t("brief.castPicker.errorNone")
                : t("brief.castPicker.errorRequiredCount", {
                    required,
                    ready: ready.length,
                  })}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCreateOpen(true)}
            className="character-split-create inline-flex shrink-0 cursor-pointer items-center justify-center rounded-r-xl border border-accent-ink bg-accent-ink px-4 font-display text-xs font-bold text-lime transition hover:bg-accent-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createBtnLabel}
          </button>
        </div>

        {onSelectStyle && availableStyleIds.length > 0 ? (
          <div className="rounded-xl border border-accent-ink/10 bg-paper/70 p-2.5">
            <p className="text-xs text-muted">{switchHint}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {availableStyleIds.map((sid) => (
                <button
                  key={sid}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectStyle(sid)}
                  className="inline-flex cursor-pointer items-center rounded-full border border-accent-ink/15 bg-white px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-accent-ink/40 hover:bg-accent-ink/5 disabled:opacity-50"
                >
                  {localizedStyleName(sid)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {createOpen ? (
          <InlineCreateCharacterDialog
            styles={styles}
            defaultStyleId={styleId}
            credits={credits}
            subscribed={subscribed}
            onCreated={handleCreatedCharacter}
            onClose={() => setCreateOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  const summary =
    selected.length === 0
      ? allowNone
        ? t("brief.castPicker.none")
        : t("brief.castPicker.placeholder")
      : selected
          .map((character) => {
            const sel = selections[character.id];
            const presetName = resolvePresetName(character, sel?.presetId, sel?.presetName);
            return presetName ? `${character.name} (${presetName})` : character.name;
          })
          .join(", ");

  const firstSelected = selected[0];
  const firstSelection = firstSelected ? selections[firstSelected.id] : undefined;
  const firstPresetName = firstSelected
    ? resolvePresetName(firstSelected, firstSelection?.presetId, firstSelection?.presetName)
    : undefined;
  const firstIsGenerating = firstSelected
    ? firstSelected.versions.some(
        (v) => v.status === "queued" || v.status === "in_progress",
      ) && !blueprintForStyle(firstSelected, styleId)
    : false;
  const firstThumb = firstSelected
    ? displayForSelection(
        firstSelected,
        styleId,
        firstSelection?.versionId,
        firstSelection?.presetId,
      )
    : "";

  return (
    <div>
      {/* Connected Split Control: Left dropdown trigger + Right connected Create button */}
      <div className="character-split-control flex items-stretch">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="character-split-trigger flex min-h-[4.5rem] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-l-xl border border-r-0 border-accent-ink/15 bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-accent-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {firstSelected && firstThumb ? (
            <CharacterThumb src={firstThumb} />
          ) : firstIsGenerating ? (
            <span className="grid h-14 w-24 shrink-0 place-items-center rounded-md border border-accent-ink/15 bg-white">
              <Spinner className="h-4 w-4" />
            </span>
          ) : (
            <EmptyThumb />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {summary}
            </span>
            {selected.length === 1 && firstSelected ? (
              firstIsGenerating ? (
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-accent">
                  {locale === "zh-Hant"
                    ? "藍圖產生中…"
                    : locale === "zh-Hans"
                      ? "蓝图生成中…"
                      : "Generating blueprint…"}
                </span>
              ) : firstPresetName ? (
                <span className="mt-0.5 inline-block rounded-full bg-accent-ink/8 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  {t("brief.castPicker.presetSelectedBadge", {
                    name: firstPresetName,
                  })}
                </span>
              ) : (
                <span className="block text-xs text-muted">
                  {t("brief.castPicker.defaultLookBadge")}
                </span>
              )
            ) : null}
            {selected.length > 1 ? (
              <span className="mt-0.5 block text-xs text-muted">
                {t("brief.castPicker.selectedCount", { n: selected.length })}
              </span>
            ) : null}
          </span>
          <DialogTriggerIcon />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setCreateOpen(true)}
          title={t("characters.createSimple")}
          className="character-split-create inline-flex shrink-0 cursor-pointer items-center justify-center rounded-r-xl border border-accent-ink bg-accent-ink px-3.5 font-display text-xs font-bold text-lime transition hover:bg-accent-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createBtnLabel}
        </button>
      </div>

      {open ? (
        <CharacterSelectDialog
          characters={ready}
          styleId={styleId}
          value={value}
          selections={selections}
          max={max}
          required={required}
          onChange={onChange}
          onSelectionsChange={setSelections}
          onCharacterUpdated={(updated) =>
            setOverrides((prev) => ({ ...prev, [updated.id]: updated }))
          }
          onClose={() => setOpen(false)}
        />
      ) : null}

      {createOpen ? (
        <InlineCreateCharacterDialog
          styles={styles}
          defaultStyleId={styleId}
          credits={credits}
          subscribed={subscribed}
          onCreated={handleCreatedCharacter}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}

      {managingCharId ? (
        <CharacterManageDialog
          character={
            ready.find((c) => c.id === managingCharId) || ready[0]!
          }
          styleId={styleId}
          initialSelection={selections[managingCharId]}
          onCharacterUpdated={(updated) =>
            setOverrides((prev) => ({ ...prev, [updated.id]: updated }))
          }
          onSelectAndClose={(option) => {
            const targetId = managingCharId;
            setManagingCharId(null);
            if (!multiple) {
              onChange([targetId]);
              setSelections({ [targetId]: option });
              return;
            }
            const nextIds = value.includes(targetId)
              ? value
              : value.length < max
                ? [...value, targetId]
                : value;
            onChange(nextIds);
            setSelections({ ...selections, [targetId]: option });
          }}
          onClose={() => setManagingCharId(null)}
        />
      ) : null}

      <p
        className={`mt-2 text-xs ${
          pick.ok ? "text-muted" : "font-medium text-accent"
        }`}
      >
        {ready.length === 0 ? t("brief.castPicker.errorNone") : pick.text}
        {ready.length === 0 ? (
          <Link
            href="/app/characters"
            className="ml-1 underline underline-offset-4"
          >
            {t("brief.castPicker.linkCreate")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() =>
              setManagingCharId(firstSelected?.id || ready[0]!.id)
            }
            className="ml-1 cursor-pointer underline underline-offset-4 hover:text-foreground"
          >
            {t("brief.castPicker.linkManage")}
          </button>
        )}
      </p>
    </div>
  );
}

function blueprintForStyle(character: PublicCharacter, styleId?: string) {
  if (!styleId) return character.previewUrl;
  return defaultSheetForStyle(character, styleId)?.blueprintUrl ?? null;
}

function resolvePresetName(
  character: PublicCharacter,
  presetId?: string,
  fallbackName?: string,
) {
  if (presetId) {
    const found = (character.presets || []).find((p) => p.id === presetId);
    if (found) return found.name;
  }
  return fallbackName;
}

// Thumbnail for the selected preset or default blueprint in the given style (or reference image while generating).
function displayForSelection(
  character: PublicCharacter,
  styleId?: string,
  versionId?: string,
  presetId?: string,
) {
  if (presetId) {
    const preset = (character.presets || []).find((p) => p.id === presetId);
    if (preset) {
      return (
        preset.portraitUrl ||
        preset.profileUrl ||
        preset.blueprintUrl ||
        character.previewUrl ||
        ""
      );
    }
  }
  if (versionId) {
    const version = character.versions.find((v) => v.id === versionId);
    if (version) {
      return (
        version.portraitUrl ||
        version.profileUrl ||
        version.blueprintUrl ||
        version.referenceImageUrl ||
        character.previewUrl ||
        ""
      );
    }
  }
  const sheet = defaultSheetForStyle(character, styleId);
  const fallbackRef = character.versions[0]?.referenceImageUrl || "";
  return (
    sheet?.portraitUrl ||
    sheet?.profileUrl ||
    sheet?.blueprintUrl ||
    character.previewUrl ||
    fallbackRef ||
    ""
  );
}

function CharacterThumb({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={96}
      height={64}
      className="h-14 w-24 shrink-0 rounded-md border border-accent-ink/10 bg-white object-contain object-center"
    />
  );
}

function EmptyThumb() {
  return (
    <span className="grid h-14 w-24 shrink-0 place-items-center rounded-md border border-dashed border-accent-ink/15 text-xs text-muted">
      —
    </span>
  );
}

function DialogTriggerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-muted"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
