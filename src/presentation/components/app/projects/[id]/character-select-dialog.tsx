"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  addCharacterStyleAction,
  refreshCharacterAction,
} from "@/presentation/actions/characters";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { AddCharacterStyleDialog } from "@/presentation/components/app/characters/[id]/add-character-style-dialog";
import { LookCardImage } from "@/presentation/components/app/jutsu/look-card-image";
import { castPickStatus } from "@/presentation/components/app/projects/[id]/cast-pick-status";
import { CharacterManageDialog } from "@/presentation/components/app/projects/[id]/character-manage-dialog";
import { InlineCreateCharacterDialog } from "@/presentation/components/app/projects/[id]/inline-create-character-dialog";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
  PublicStyle,
} from "@/presentation/serialize";
import { isCreditGateError } from "@/service/billing/credit-gate";
import type {
  CharacterPresetSelection,
  CharacterSelectionMap,
} from "@/service/character/character-presets";
import { BLUEPRINT_COST } from "@/service/production-plan";
import { STYLES } from "@/service/style/catalog";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { localizedStyleName } from "@/util/style-i18n";

type LookMode = "presets" | "history";

const RECENT_PRESETS_STORAGE_KEY = "scro:recent-character-presets:v1";

const DEFAULT_PUBLIC_STYLES: PublicStyle[] = STYLES.map((style) => ({
  id: style.id,
  name: style.name,
  description: style.description,
  canvasColor: style.canvasColor,
  previewUrl: style.previewUrl,
  isCustom: false,
}));

function readRecentPresetIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function recordRecentPresetId(presetId: string): string[] {
  const current = readRecentPresetIds();
  const next = [presetId, ...current.filter((id) => id !== presetId)].slice(
    0,
    16,
  );
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        RECENT_PRESETS_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch {
      // Ignore storage quota errors.
    }
  }
  return next;
}

export function foundationStyleForPublicCharacter(
  character: Pick<PublicCharacter, "styleId" | "styleIds">,
): string {
  if (
    character.styleId === "realistic" ||
    character.styleIds?.includes("realistic")
  ) {
    return "realistic";
  }
  return character.styleIds?.[0] || character.styleId || "realistic";
}

// Completed default sheet for a character in its realistic foundation style (ignoring video styleId).
export function defaultSheetForStyle(
  character: PublicCharacter,
  _styleId?: string,
): PublicCharacterVersion | null {
  void _styleId;
  const targetStyle = foundationStyleForPublicCharacter(character);
  const versions = character.versions.filter((version) => {
    const id = version.styleId || character.styleId;
    return (
      !version.isBaseCandidate &&
      id === targetStyle &&
      version.status === "completed" &&
      Boolean(version.blueprintUrl || version.portraitUrl || version.profileUrl)
    );
  });
  const preferred =
    character.defaultByStyle[targetStyle] ??
    character.baseVersionId ??
    character.defaultVersionId;
  return versions.find((version) => version.id === preferred) ?? versions[0] ?? null;
}

// Completed historical versions for a character in its realistic foundation style, newest first.
export function historyVersionsForCharacterStyle(
  character: PublicCharacter,
  _styleId?: string,
): PublicCharacterVersion[] {
  void _styleId;
  const targetStyle = foundationStyleForPublicCharacter(character);
  return [...character.versions]
    .filter((version) => {
      const id = version.styleId || character.styleId;
      return (
        !version.isBaseCandidate &&
        id === targetStyle &&
        version.status === "completed" &&
        Boolean(version.blueprintUrl || version.portraitUrl || version.profileUrl)
      );
    })
    .sort((a, b) => b.number - a.number);
}

// Presets belonging to a character for its realistic foundation style.
export function presetsForCharacterStyle(
  character: PublicCharacter,
  _styleId?: string,
): PublicCharacterPreset[] {
  void _styleId;
  const targetStyle = foundationStyleForPublicCharacter(character);
  return (character.presets || []).filter(
    (preset) => preset.styleId === targetStyle,
  );
}

function characterAvatarThumb(character: PublicCharacter, styleId?: string): string {
  const styleSheet = defaultSheetForStyle(character, styleId);
  if (styleSheet) {
    return (
      styleSheet.portraitUrl ||
      styleSheet.profileUrl ||
      styleSheet.blueprintUrl ||
      character.previewUrl ||
      ""
    );
  }
  const anySheet = defaultSheetForStyle(character);
  return (
    anySheet?.portraitUrl ||
    anySheet?.profileUrl ||
    character.previewUrl ||
    anySheet?.blueprintUrl ||
    character.versions[0]?.referenceImageUrl ||
    ""
  );
}

/**
 * Unified Character & Preset Selection Dialog across the platform:
 * - Select a character from the top avatar strip, and show its presets below
 * - Show Presets first (default tab) and History second
 * - Create a new character directly from the dialog (`+ New Character`)
 * - Add a visual style to any character directly inside the dialog (`+ Add Style`)
 */
export function CharacterSelectDialog({
  characters: initialCharacters,
  styles: propStyles,
  styleId,
  value,
  selections,
  max,
  required,
  credits = 0,
  subscribed = false,
  onChange,
  onSelectionsChange,
  onCharacterUpdated,
  onCharacterCreated,
  onCreateCharacter,
  onClose,
}: {
  characters: PublicCharacter[];
  styles?: PublicStyle[];
  styleId?: string;
  value: string[];
  selections: CharacterSelectionMap;
  max: number;
  required: number;
  credits?: number;
  subscribed?: boolean;
  onChange: (ids: string[]) => void;
  onSelectionsChange: (next: CharacterSelectionMap) => void;
  onCharacterUpdated?: (next: PublicCharacter) => void;
  onCharacterCreated?: (created: PublicCharacter) => void;
  onCreateCharacter?: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const availableStyles =
    propStyles && propStyles.length > 0 ? propStyles : DEFAULT_PUBLIC_STYLES;

  const [createdList, setCreatedList] = useState<PublicCharacter[]>([]);
  const [overrides, setOverrides] = useState<Record<string, PublicCharacter>>({});

  const characters = useMemo(() => {
    const merged = [...initialCharacters];
    for (const item of createdList) {
      if (!merged.some((existing) => existing.id === item.id)) {
        merged.unshift(item);
      }
    }
    return merged.map((c) => overrides[c.id] ?? c);
  }, [initialCharacters, createdList, overrides]);

  const [activeCharId, setActiveCharId] = useState<string>(
    () => value[0] || initialCharacters[0]?.id || "",
  );
  const [lookMode, setLookMode] = useState<LookMode>("presets");
  const [managingCharId, setManagingCharId] = useState<string | null>(null);
  const [createCharOpen, setCreateCharOpen] = useState(false);
  const [addStyleCharId, setAddStyleCharId] = useState<string | null>(null);
  const [addingQuickStyle, setAddingQuickStyle] = useState(false);
  const [quickStyleError, setQuickStyleError] = useState("");
  const [creditGate, setCreditGate] = useState(false);
  const [query, setQuery] = useState("");
  const [, setRecentIds] = useState<string[]>(() => readRecentPresetIds());

  const multiple = max > 1;
  const allowNone = required === 0;
  const pick = castPickStatus(value.length, required, max, t);

  // Poll any character that has a version currently queued or in_progress.
  useEffect(() => {
    const generatingIds = characters
      .filter((c) =>
        c.versions.some((v) => v.status === "queued" || v.status === "in_progress"),
      )
      .map((c) => c.id);
    if (generatingIds.length === 0) return;

    const timer = window.setInterval(() => {
      for (const id of generatingIds) {
        void refreshCharacterAction(id).then((res) => {
          if (res.ok) {
            setOverrides((prev) => ({ ...prev, [res.character.id]: res.character }));
            onCharacterUpdated?.(res.character);
          }
        });
      }
    }, 3500);
    return () => window.clearInterval(timer);
  }, [characters, onCharacterUpdated]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !managingCharId &&
        !createCharOpen &&
        !addStyleCharId &&
        !creditGate
      ) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, managingCharId, createCharOpen, addStyleCharId, creditGate]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCharacters = useMemo(() => {
    if (!normalizedQuery) return characters;
    return characters.filter((character) => {
      if (character.name.toLowerCase().includes(normalizedQuery)) return true;
      return (character.presets || []).some(
        (preset) =>
          preset.name.toLowerCase().includes(normalizedQuery) ||
          (preset.editInstruction &&
            preset.editInstruction.toLowerCase().includes(normalizedQuery)),
      );
    });
  }, [characters, normalizedQuery]);

  const activeCharacter = useMemo(
    () =>
      characters.find((c) => c.id === activeCharId) ||
      filteredCharacters[0] ||
      characters[0] ||
      null,
    [characters, filteredCharacters, activeCharId],
  );

  const managingCharacter = useMemo(
    () => characters.find((c) => c.id === managingCharId) || null,
    [characters, managingCharId],
  );

  const addStyleCharacter = useMemo(
    () => characters.find((c) => c.id === addStyleCharId) || null,
    [characters, addStyleCharId],
  );

  function selectCharacterWithOption(
    characterId: string,
    option?: CharacterPresetSelection,
    closeWhenSingle = true,
  ) {
    setActiveCharId(characterId);
    const isAlreadySelected = value.includes(characterId);
    const currentSelection = selections[characterId];
    const sameOption =
      (option?.presetId || "") === (currentSelection?.presetId || "") &&
      (option?.versionId || "") === (currentSelection?.versionId || "");

    if (option?.presetId) {
      setRecentIds(recordRecentPresetId(option.presetId));
    }

    if (isAlreadySelected && sameOption && multiple && !closeWhenSingle) {
      onChange(value.filter((id) => id !== characterId));
      const nextSelections = { ...selections };
      delete nextSelections[characterId];
      onSelectionsChange(nextSelections);
      return;
    }

    if (isAlreadySelected) {
      const nextSelections = { ...selections };
      if (option) nextSelections[characterId] = option;
      else delete nextSelections[characterId];
      onSelectionsChange(nextSelections);
      if (!multiple && closeWhenSingle) onClose();
      return;
    }

    if (!multiple) {
      onChange([characterId]);
      onSelectionsChange(option ? { [characterId]: option } : {});
      if (closeWhenSingle) onClose();
      return;
    }

    if (value.length >= max) return;
    onChange([...value, characterId]);
    const nextSelections = { ...selections };
    if (option) nextSelections[characterId] = option;
    else delete nextSelections[characterId];
    onSelectionsChange(nextSelections);
  }

  async function handleQuickAddCurrentStyle(char: PublicCharacter, targetStyleId: string) {
    if (addingQuickStyle) return;
    setAddingQuickStyle(true);
    setQuickStyleError("");
    try {
      const res = await addCharacterStyleAction(char.id, targetStyleId);
      if (!res.ok) {
        if (isCreditGateError(res.error)) {
          setCreditGate(true);
          return;
        }
        setQuickStyleError(translateAppError(res.error, t));
        return;
      }
      setOverrides((prev) => ({ ...prev, [res.character.id]: res.character }));
      onCharacterUpdated?.(res.character);
    } finally {
      setAddingQuickStyle(false);
    }
  }

  function handleOpenCreateCharacter() {
    if (onCreateCharacter) {
      onCreateCharacter();
      return;
    }
    setCreateCharOpen(true);
  }

  const activeCharPresets = useMemo(
    () => (activeCharacter ? presetsForCharacterStyle(activeCharacter, styleId) : []),
    [activeCharacter, styleId],
  );
  const activeCharHistory = useMemo(
    () =>
      activeCharacter
        ? historyVersionsForCharacterStyle(activeCharacter, styleId)
        : [],
    [activeCharacter, styleId],
  );
  const activeDefaultSheet = useMemo(
    () => (activeCharacter ? defaultSheetForStyle(activeCharacter, styleId) : null),
    [activeCharacter, styleId],
  );
  const activeCharGeneratingForStyle = useMemo(() => {
    if (!activeCharacter) return false;
    return activeCharacter.versions.some(
      (v) =>
        (!styleId || (v.styleId || activeCharacter.styleId) === styleId) &&
        (v.status === "queued" || v.status === "in_progress"),
    );
  }, [activeCharacter, styleId]);

  const activeCharSelected = activeCharacter ? value.includes(activeCharacter.id) : false;
  const activeSelection = activeCharacter ? selections[activeCharacter.id] : undefined;
  const activeDefaultSelected =
    Boolean(activeCharacter && activeDefaultSheet) &&
    activeCharSelected &&
    !activeSelection?.presetId &&
    (!activeSelection?.versionId || activeSelection.versionId === activeDefaultSheet?.id);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-accent-ink/15 bg-paper shadow-2xl"
      >
        {/* Dialog Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-lg font-bold text-[#12141c]">
              {t("brief.castPicker.dialogTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {t("brief.castPicker.dialogSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateCharacter}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-2xl bg-[#12141c] px-3.5 text-xs font-bold text-[#c6f24b] transition hover:bg-black"
            >
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>{isEn ? "New Character" : "新增角色"}</span>
            </button>

            <span
              className={`rounded-2xl px-3 py-1 text-xs font-semibold ${
                pick.ok
                  ? "bg-accent-ink/8 text-foreground"
                  : "bg-accent/15 text-accent"
              }`}
            >
              {pick.text}
            </span>

            {allowNone && value.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  onSelectionsChange({});
                }}
                className="cursor-pointer rounded-2xl border border-accent-ink/15 px-3 py-1 text-xs font-semibold text-muted hover:text-foreground"
              >
                {t("brief.castPicker.clearSelection")}
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="shrink-0 border-b border-accent-ink/10 bg-paper/80 px-6 py-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("brief.castPicker.searchPlaceholder")}
            aria-label={t("brief.castPicker.searchPlaceholder")}
            className="h-10 w-full rounded-2xl border border-accent-ink/20 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        {/* Main Scrollable Content: Layer 1 (Character Strip) + Layer 2 (Presets first / History second + Add Style) */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Layer 1: Character Selector Strip */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {isEn ? "1. Select Character" : "1. 選擇角色"}
              </span>
              <span className="text-xs text-muted">
                {isEn
                  ? `${filteredCharacters.length} characters`
                  : `共 ${filteredCharacters.length} 位角色`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-7">
              {allowNone ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange([]);
                    onSelectionsChange({});
                    if (!multiple) onClose();
                  }}
                  className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-2xl border p-2 text-center transition ${
                    value.length === 0
                      ? "border-2 border-[#12141c] bg-[#12141c] text-[#c6f24b] ring-2 ring-[#c6f24b]"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  <span className="text-base font-bold">∅</span>
                  <span className="mt-1 text-[10px] font-bold leading-tight">
                    {isEn ? "None" : "不使用角色"}
                  </span>
                </button>
              ) : null}

              {filteredCharacters.map((char) => {
                const isSelected = value.includes(char.id);
                const isFocused = activeCharacter?.id === char.id;
                const avatar = characterAvatarThumb(char);
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => {
                      setActiveCharId(char.id);
                      setLookMode("presets");
                      setQuickStyleError("");
                      const sheet = defaultSheetForStyle(char);
                      if (sheet && !isSelected && (!multiple || value.length < max)) {
                        selectCharacterWithOption(
                          char.id,
                          { versionId: sheet.id },
                          false,
                        );
                      }
                    }}
                    className={`style-option group relative flex aspect-square w-full cursor-pointer flex-col justify-end overflow-hidden rounded-2xl border text-left transition ${
                      isSelected
                        ? "border-2 border-[#12141c] ring-2 ring-[#c6f24b]"
                        : isFocused
                          ? "border-2 border-[#12141c]"
                          : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatar}
                        alt={char.name}
                        className="absolute inset-0 h-full w-full object-cover object-top transition duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-zinc-100 text-xs font-bold text-zinc-500">
                        {char.name.slice(0, 2)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    {isSelected ? (
                      <span className="absolute top-1.5 right-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#c6f24b] text-[10px] font-extrabold text-[#12141c]">
                        ✓
                      </span>
                    ) : null}
                    <span className="relative z-10 truncate px-2 py-1.5 text-[11px] font-bold text-white">
                      {char.name}
                    </span>
                  </button>
                );
              })}

              {/* Quick + New Character Tile inside strip */}
              <button
                type="button"
                onClick={handleOpenCreateCharacter}
                className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-zinc-300 bg-[#f4f4f5] p-2 text-center text-zinc-600 transition hover:border-[#12141c] hover:text-[#12141c]"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-[10px] font-bold leading-tight">
                  {isEn ? "New Character" : "新增角色"}
                </span>
              </button>
            </div>
          </div>

          {/* Layer 2: Selected Character's Presets (First) & History (Second) + Add Style */}
          {activeCharacter ? (
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-[#f4f4f5] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-bold text-[#12141c]">
                    {activeCharacter.name}
                  </h3>

                  {/* Character's realistic foundation badge */}
                  <span className="rounded-2xl bg-[#12141c] px-2.5 py-0.5 text-[10px] font-bold text-[#c6f24b]">
                    {localizedStyleName("realistic")}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Presets (first) | History (second) tabs */}
                  <div
                    role="tablist"
                    className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={lookMode === "presets"}
                      onClick={() => setLookMode("presets")}
                      className={`cursor-pointer rounded-2xl px-3 py-1 text-xs font-bold transition ${
                        lookMode === "presets"
                          ? "bg-[#12141c] text-[#c6f24b]"
                          : "text-zinc-500 hover:text-[#12141c]"
                      }`}
                    >
                      {isEn
                        ? `Presets (${(activeDefaultSheet ? 1 : 0) + activeCharPresets.length})`
                        : `預設造型 Presets (${(activeDefaultSheet ? 1 : 0) + activeCharPresets.length})`}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={lookMode === "history"}
                      onClick={() => setLookMode("history")}
                      className={`cursor-pointer rounded-2xl px-3 py-1 text-xs font-bold transition ${
                        lookMode === "history"
                          ? "bg-[#12141c] text-[#c6f24b]"
                          : "text-zinc-500 hover:text-[#12141c]"
                      }`}
                    >
                      {isEn
                        ? `History (${activeCharHistory.length})`
                        : `歷史造型 History (${activeCharHistory.length})`}
                    </button>
                  </div>

                  {activeDefaultSheet ? (
                    <button
                      type="button"
                      onClick={() => setManagingCharId(activeCharacter.id)}
                      className="inline-flex h-8 cursor-pointer items-center rounded-2xl border border-[#12141c] bg-[#c6f24b] px-3 text-xs font-bold text-[#12141c] transition hover:bg-[#b6e23a]"
                    >
                      {isEn ? "+ Customize Outfit" : "+ 臨時換裝"}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* If character doesn't have a completed blueprint for the current video styleId yet */}
              {styleId && !activeDefaultSheet ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center">
                  {activeCharGeneratingForStyle ? (
                    <>
                      <Spinner className="h-6 w-6 text-[#12141c]" />
                      <p className="text-sm font-bold text-[#12141c]">
                        {isEn
                          ? `Generating ${localizedStyleName(styleId)} blueprint for ${activeCharacter.name}…`
                          : `正在為「${activeCharacter.name}」生成「${localizedStyleName(styleId)}」風格藍圖…`}
                      </p>
                      <p className="text-xs text-muted">
                        {isEn
                          ? "This dialog will update automatically as soon as the blueprint is ready."
                          : "完成後此視窗會自動更新並可供選用。"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-[#12141c]">
                        {isEn
                          ? `${activeCharacter.name} does not have a "${localizedStyleName(styleId)}" style blueprint yet.`
                          : `「${activeCharacter.name}」尚未建立「${localizedStyleName(styleId)}」風格的藍圖。`}
                      </p>
                      {quickStyleError ? (
                        <p className="text-xs font-semibold text-red-600">
                          {quickStyleError}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={addingQuickStyle}
                          onClick={() =>
                            void handleQuickAddCurrentStyle(activeCharacter, styleId)
                          }
                          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-2xl bg-[#12141c] px-4 text-xs font-bold text-[#c6f24b] transition hover:bg-black disabled:opacity-50"
                        >
                          {addingQuickStyle ? <Spinner className="h-4 w-4" /> : null}
                          <span>
                            {isEn
                              ? `+ Generate "${localizedStyleName(styleId)}" Style (${BLUEPRINT_COST} credits)`
                              : `+ 立即新增「${localizedStyleName(styleId)}」風格 (${BLUEPRINT_COST} 點)`}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddStyleCharId(activeCharacter.id)}
                          className="inline-flex h-10 cursor-pointer items-center rounded-2xl border border-zinc-300 bg-white px-4 text-xs font-bold text-[#12141c] hover:border-[#12141c]"
                        >
                          {isEn ? "Browse All Styles…" : "選擇其他風格…"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : lookMode === "presets" ? (
                /* Presets Grid (Default Look + Saved Presets) */
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {activeDefaultSheet ? (
                    <button
                      type="button"
                      onClick={() =>
                        selectCharacterWithOption(activeCharacter.id, {
                          versionId: activeDefaultSheet.id,
                        })
                      }
                      className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border p-2 text-left transition ${
                        activeDefaultSelected
                          ? "border-2 border-[#12141c] bg-[#12141c] text-white ring-2 ring-[#c6f24b]"
                          : "border-zinc-200 bg-white text-[#12141c] hover:border-zinc-400"
                      }`}
                    >
                      <LookCardImage
                        src={
                          activeDefaultSheet.profileUrl ||
                          activeDefaultSheet.portraitUrl ||
                          activeDefaultSheet.blueprintUrl ||
                          activeCharacter.previewUrl ||
                          ""
                        }
                        alt={activeCharacter.name}
                      />
                      <span className="mt-2 truncate text-xs font-bold">
                        {t("brief.castPicker.defaultLookBadge")}
                      </span>
                      <span
                        className={`truncate text-[11px] ${
                          activeDefaultSelected ? "text-white/75" : "text-zinc-500"
                        }`}
                      >
                        {activeCharacter.name}
                      </span>
                    </button>
                  ) : null}

                  {activeCharPresets.map((preset) => {
                    const isPresetSelected =
                      activeCharSelected && activeSelection?.presetId === preset.id;
                    const thumb =
                      preset.profileUrl ||
                      preset.portraitUrl ||
                      preset.blueprintUrl ||
                      activeCharacter.previewUrl ||
                      "";
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          selectCharacterWithOption(activeCharacter.id, {
                            versionId: preset.versionId,
                            presetId: preset.id,
                            presetName: preset.name,
                          })
                        }
                        className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border p-2 text-left transition ${
                          isPresetSelected
                            ? "border-2 border-[#12141c] bg-[#12141c] text-white ring-2 ring-[#c6f24b]"
                            : "border-zinc-200 bg-white text-[#12141c] hover:border-zinc-400"
                        }`}
                      >
                        {thumb ? (
                          <LookCardImage src={thumb} alt={preset.name} />
                        ) : null}
                        <span className="mt-2 truncate text-xs font-bold">
                          {preset.name}
                        </span>
                        <span
                          className={`truncate text-[11px] ${
                            isPresetSelected ? "text-white/75" : "text-zinc-500"
                          }`}
                        >
                          {preset.editInstruction || activeCharacter.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* History Versions Grid */
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {activeCharHistory.map((ver) => {
                    const isVerSelected =
                      activeCharSelected &&
                      !activeSelection?.presetId &&
                      activeSelection?.versionId === ver.id;
                    const thumb =
                      ver.profileUrl ||
                      ver.portraitUrl ||
                      ver.blueprintUrl ||
                      activeCharacter.previewUrl ||
                      "";
                    const label = ver.editInstruction
                      ? ver.editInstruction
                          .replace(/\s*Isolated wardrobe piece [\w-]+\.?/gi, "")
                          .slice(0, 32)
                      : isEn
                        ? `Look #${ver.number}`
                        : `歷史造型 #${ver.number}`;
                    return (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() =>
                          selectCharacterWithOption(activeCharacter.id, {
                            versionId: ver.id,
                            presetName: label,
                          })
                        }
                        className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border p-2 text-left transition ${
                          isVerSelected
                            ? "border-2 border-[#12141c] bg-[#12141c] text-white ring-2 ring-[#c6f24b]"
                            : "border-zinc-200 bg-white text-[#12141c] hover:border-zinc-400"
                        }`}
                      >
                        {thumb ? <LookCardImage src={thumb} alt={label} /> : null}
                        <span className="mt-2 truncate text-xs font-bold">
                          {label}
                        </span>
                        <span
                          className={`truncate text-[11px] ${
                            isVerSelected ? "text-white/75" : "text-zinc-500"
                          }`}
                        >
                          v{ver.number} · {new Date(ver.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Dialog Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-accent-ink/10 bg-paper px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 cursor-pointer items-center rounded-2xl bg-accent-ink px-5 text-xs font-bold text-lime transition hover:bg-black"
          >
            {t("brief.castPicker.doneButton")}
          </button>
        </div>
      </div>

      {/* Inline Create New Character Modal */}
      {createCharOpen ? (
        <InlineCreateCharacterDialog
          styles={availableStyles}
          defaultStyleId={styleId}
          credits={credits}
          subscribed={subscribed}
          onCreated={(created) => {
            setCreatedList((prev) => [created, ...prev]);
            setOverrides((prev) => ({ ...prev, [created.id]: created }));
            setActiveCharId(created.id);
            setLookMode("presets");
            onCharacterCreated?.(created);
            onCharacterUpdated?.(created);
            if (!multiple) {
              onChange([created.id]);
              onSelectionsChange({});
            } else if (value.length < max) {
              onChange([...value, created.id]);
            }
          }}
          onClose={() => setCreateCharOpen(false)}
        />
      ) : null}

      {/* Add Style to Character Modal */}
      {addStyleCharacter ? (
        <AddCharacterStyleDialog
          character={addStyleCharacter}
          styles={availableStyles}
          onClose={() => setAddStyleCharId(null)}
          onAdded={(updated) => {
            setOverrides((prev) => ({ ...prev, [updated.id]: updated }));
            onCharacterUpdated?.(updated);
            setAddStyleCharId(null);
          }}
          onNeedCredits={() => {
            setAddStyleCharId(null);
            setCreditGate(true);
          }}
        />
      ) : null}

      {creditGate ? (
        <InsufficientCreditsDialog
          needed={BLUEPRINT_COST}
          subscribed={subscribed}
          onClose={() => setCreditGate(false)}
          onPaid={() => setCreditGate(false)}
        />
      ) : null}

      {managingCharacter ? (
        <CharacterManageDialog
          character={managingCharacter}
          styleId={styleId}
          initialSelection={selections[managingCharacter.id]}
          onCharacterUpdated={(updated) => {
            setOverrides((prev) => ({ ...prev, [updated.id]: updated }));
            onCharacterUpdated?.(updated);
          }}
          onSelectAndClose={(option) => {
            setManagingCharId(null);
            if (option.presetId) {
              setRecentIds(recordRecentPresetId(option.presetId));
            }
            if (!multiple) {
              onChange([managingCharacter.id]);
              onSelectionsChange({ [managingCharacter.id]: option });
              onClose();
              return;
            }
            const nextIds = value.includes(managingCharacter.id)
              ? value
              : value.length < max
                ? [...value, managingCharacter.id]
                : value;
            onChange(nextIds);
            onSelectionsChange({
              ...selections,
              [managingCharacter.id]: option,
            });
          }}
          onClose={() => setManagingCharId(null)}
        />
      ) : null}
    </DialogBackdrop>
  );
}
