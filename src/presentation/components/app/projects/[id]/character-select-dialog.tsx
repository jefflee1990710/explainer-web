"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { castPickStatus } from "@/presentation/components/app/projects/[id]/cast-pick-status";
import { CharacterManageDialog } from "@/presentation/components/app/projects/[id]/character-manage-dialog";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
} from "@/presentation/serialize";
import type {
  CharacterPresetSelection,
  CharacterSelectionMap,
} from "@/service/character/character-presets";

type LookMode = "presets" | "history";

const RECENT_PRESETS_STORAGE_KEY = "scro:recent-character-presets:v1";
const MAX_RECENT_PRESETS = 6;

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

// Completed default sheet for a character in the given style.
export function defaultSheetForStyle(
  character: PublicCharacter,
  styleId?: string,
): PublicCharacterVersion | null {
  const versions = character.versions.filter((version) => {
    const id = version.styleId || character.styleId;
    return (
      (!styleId || id === styleId) &&
      version.status === "completed" &&
      Boolean(version.blueprintUrl)
    );
  });
  const preferred = styleId
    ? character.defaultByStyle[styleId]
    : character.defaultVersionId;
  return versions.find((version) => version.id === preferred) ?? versions[0] ?? null;
}

// Completed historical versions for a character in the given style, newest first.
export function historyVersionsForCharacterStyle(
  character: PublicCharacter,
  styleId?: string,
): PublicCharacterVersion[] {
  return [...character.versions]
    .filter((version) => {
      const id = version.styleId || character.styleId;
      return (
        (!styleId || id === styleId) &&
        version.status === "completed" &&
        Boolean(version.blueprintUrl || version.portraitUrl || version.profileUrl)
      );
    })
    .sort((a, b) => b.number - a.number);
}

// Presets belonging to a character for the current video style.
export function presetsForCharacterStyle(
  character: PublicCharacter,
  styleId?: string,
): PublicCharacterPreset[] {
  return (character.presets || []).filter(
    (preset) => !styleId || preset.styleId === styleId,
  );
}

// Modal dialog for selecting characters and their saved blueprint presets / history / ad-hoc outfit changes.
export function CharacterSelectDialog({
  characters: initialCharacters,
  styleId,
  value,
  selections,
  max,
  required,
  onChange,
  onSelectionsChange,
  onCharacterUpdated,
  onCreateCharacter,
  onClose,
}: {
  characters: PublicCharacter[];
  styleId?: string;
  value: string[];
  selections: CharacterSelectionMap;
  max: number;
  required: number;
  onChange: (ids: string[]) => void;
  onSelectionsChange: (next: CharacterSelectionMap) => void;
  onCharacterUpdated?: (next: PublicCharacter) => void;
  onCreateCharacter?: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();
  const [overrides, setOverrides] = useState<Record<string, PublicCharacter>>(
    {},
  );
  const characters = useMemo(
    () => initialCharacters.map((c) => overrides[c.id] ?? c),
    [initialCharacters, overrides],
  );
  const [managingCharId, setManagingCharId] = useState<string | null>(null);
  const [activeCharId, setActiveCharId] = useState<string>(
    () => value[0] || initialCharacters[0]?.id || "",
  );
  const [lookModeByChar, setLookModeByChar] = useState<Record<string, LookMode>>(
    {},
  );
  const [query, setQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>(() =>
    readRecentPresetIds(),
  );
  const multiple = max > 1;
  const allowNone = required === 0;
  const pick = castPickStatus(value.length, required, max, t);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !managingCharId) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, managingCharId]);

  const managingCharacter = useMemo(
    () => characters.find((c) => c.id === managingCharId) || null,
    [characters, managingCharId],
  );

  const normalizedQuery = query.trim().toLowerCase();

  // Flatten all available presets across ready characters for the current style.
  const allStylePresets = useMemo(() => {
    const list: Array<{
      character: PublicCharacter;
      preset: PublicCharacterPreset;
    }> = [];
    for (const character of characters) {
      for (const preset of presetsForCharacterStyle(character, styleId)) {
        list.push({ character, preset });
      }
    }
    return list;
  }, [characters, styleId]);

  // Build Recent Presets list: localStorage order first, then newest saved presets.
  const recentPresets = useMemo(() => {
    const byId = new Map(
      allStylePresets.map((entry) => [entry.preset.id, entry]),
    );
    const ordered: Array<{
      character: PublicCharacter;
      preset: PublicCharacterPreset;
    }> = [];
    const seen = new Set<string>();

    for (const id of recentIds) {
      const entry = byId.get(id);
      if (entry && !seen.has(id)) {
        seen.add(id);
        ordered.push(entry);
      }
    }
    const newest = [...allStylePresets].sort((a, b) =>
      b.preset.createdAt.localeCompare(a.preset.createdAt),
    );
    for (const entry of newest) {
      if (!seen.has(entry.preset.id)) {
        seen.add(entry.preset.id);
        ordered.push(entry);
      }
    }

    const filtered = normalizedQuery
      ? ordered.filter(
          ({ character, preset }) =>
            preset.name.toLowerCase().includes(normalizedQuery) ||
            character.name.toLowerCase().includes(normalizedQuery) ||
            (preset.editInstruction &&
              preset.editInstruction.toLowerCase().includes(normalizedQuery)),
        )
      : ordered;

    return filtered.slice(0, MAX_RECENT_PRESETS);
  }, [allStylePresets, recentIds, normalizedQuery]);

  // Filter characters and their presets by search query.
  const visibleCharacters = useMemo(() => {
    return characters.flatMap((character) => {
      const charPresets = presetsForCharacterStyle(character, styleId);
      const historyVersions = historyVersionsForCharacterStyle(character, styleId);
      if (!normalizedQuery) {
        return [{ character, presets: charPresets, historyVersions }];
      }
      const charMatches = character.name
        .toLowerCase()
        .includes(normalizedQuery);
      const matchingPresets = charPresets.filter(
        (preset) =>
          preset.name.toLowerCase().includes(normalizedQuery) ||
          (preset.editInstruction &&
            preset.editInstruction.toLowerCase().includes(normalizedQuery)),
      );
      if (!charMatches && matchingPresets.length === 0) return [];
      return [
        {
          character,
          presets: matchingPresets.length > 0 ? matchingPresets : charPresets,
          historyVersions,
        },
      ];
    });
  }, [characters, styleId, normalizedQuery]);

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

    // Clicking the exact same active option toggles the character off when multi-select or optional.
    if (isAlreadySelected && sameOption && (multiple || allowNone)) {
      onChange(value.filter((id) => id !== characterId));
      const nextSelections = { ...selections };
      delete nextSelections[characterId];
      onSelectionsChange(nextSelections);
      return;
    }

    // Switching preset/version on an already selected character keeps it selected.
    if (isAlreadySelected) {
      const nextSelections = { ...selections };
      if (option) nextSelections[characterId] = option;
      else delete nextSelections[characterId];
      onSelectionsChange(nextSelections);
      if (!multiple && closeWhenSingle) onClose();
      return;
    }

    // Selecting a new character.
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

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-accent-ink/15 bg-paper shadow-2xl"
      >
        {/* Dialog Header */}
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {t("brief.castPicker.dialogTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {t("brief.castPicker.dialogSubtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onCreateCharacter ? (
              <button
                type="button"
                onClick={onCreateCharacter}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-2xl bg-[#12141c] px-3.5 text-xs font-bold text-[#c6f24b] transition hover:bg-black"
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
            ) : null}
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
                className="cursor-pointer rounded-full border border-accent-ink/15 px-3 py-1 text-xs font-semibold text-muted hover:text-foreground"
              >
                {t("brief.castPicker.clearSelection")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
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
            autoFocus
            className="h-10 w-full rounded-full border border-accent-ink/20 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        {/* Scrollable Content: None Option + Recent Presets + Characters */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* None / No Character Option (for optional-cast directors like Explainer) */}
          {allowNone ? (
            <button
              type="button"
              onClick={() => {
                onChange([]);
                onSelectionsChange({});
                if (!multiple) onClose();
              }}
              className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                value.length === 0
                  ? "border-2 border-accent-ink bg-accent-ink text-paper shadow-[4px_4px_0_0_rgba(18,20,28,0.16)]"
                  : "border-accent-ink/15 bg-white hover:border-accent-ink/40"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm font-bold ${
                    value.length === 0
                      ? "border-paper/30 bg-paper/15 text-lime"
                      : "border-accent-ink/15 bg-paper text-muted"
                  }`}
                >
                  ∅
                </span>
                <span>
                  <span className="block font-display text-sm font-bold">
                    {isEn ? "None (No character)" : "不使用角色（None）"}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      value.length === 0 ? "text-paper/75" : "text-muted"
                    }`}
                  >
                    {isEn
                      ? "Focus on concepts, props, and visual diagrams without an on-screen character."
                      : "只展示概念圖解與物件，畫面上唔出現固定角色。"}
                  </span>
                </span>
              </span>
              {value.length === 0 ? (
                <span className="rounded-full bg-lime px-2.5 py-0.5 text-[11px] font-bold text-accent-ink">
                  {isEn ? "Selected" : "已選用"}
                </span>
              ) : null}
            </button>
          ) : null}

          {/* Recent Presets Section */}
          {recentPresets.length > 0 ? (
            <section aria-label={t("brief.castPicker.recentPresetsTitle")}>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">
                {t("brief.castPicker.recentPresetsTitle")}
              </h3>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {recentPresets.map(({ character, preset }) => {
                  const charSelected = value.includes(character.id);
                  const presetSelected =
                    charSelected &&
                    selections[character.id]?.presetId === preset.id;
                  const full = !charSelected && multiple && value.length >= max;
                  const thumb =
                    preset.portraitUrl ||
                    preset.profileUrl ||
                    preset.blueprintUrl ||
                    character.previewUrl ||
                    "";
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={full}
                      onClick={() =>
                        selectCharacterWithOption(character.id, {
                          versionId: preset.versionId,
                          presetId: preset.id,
                          presetName: preset.name,
                        })
                      }
                      className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2 text-left transition ${
                        presetSelected
                          ? "border-accent-ink bg-accent-ink text-paper shadow-[3px_3px_0_0_rgba(18,20,28,0.2)]"
                          : "border-accent-ink/15 bg-white hover:border-accent-ink/40"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl border border-accent-ink/10 bg-paper object-cover object-top"
                        />
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold">
                          {preset.name}
                        </span>
                        <span
                          className={`block truncate text-[11px] ${
                            presetSelected ? "text-paper/75" : "text-muted"
                          }`}
                        >
                          {character.name}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Character List with Presets / History / Ad-hoc Change Outfit */}
          {visibleCharacters.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              {t("brief.castPicker.noSearchMatch", { query: query.trim() })}
            </p>
          ) : (
            <div className="space-y-4">
              {visibleCharacters.map(({ character, presets, historyVersions }) => {
                const charSelected = value.includes(character.id);
                const isExpanded =
                  charSelected ||
                  activeCharId === character.id ||
                  visibleCharacters.length === 1;
                const activeSelection = selections[character.id];
                const defaultSheet = defaultSheetForStyle(character, styleId);
                const defaultSelected =
                  charSelected &&
                  !activeSelection?.presetId &&
                  (!activeSelection?.versionId ||
                    activeSelection.versionId === defaultSheet?.id);
                const full = !charSelected && multiple && value.length >= max;
                const defaultThumb =
                  defaultSheet?.portraitUrl ||
                  defaultSheet?.profileUrl ||
                  defaultSheet?.blueprintUrl ||
                  character.previewUrl ||
                  "";
                const lookMode: LookMode = lookModeByChar[character.id] ?? "presets";

                return (
                  <div
                    key={character.id}
                    onClick={() => setActiveCharId(character.id)}
                    className={`rounded-2xl border p-4 transition ${
                      charSelected
                        ? "border-accent-ink bg-accent-ink/[0.03] shadow-[4px_4px_0_0_rgba(18,20,28,0.1)]"
                        : "border-accent-ink/15 bg-white/80 hover:border-accent-ink/35"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={full}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setActiveCharId(character.id);
                          if (!charSelected && defaultSheet) {
                            selectCharacterWithOption(
                              character.id,
                              { versionId: defaultSheet.id },
                              false,
                            );
                          }
                        }}
                        className="flex cursor-pointer items-center gap-2.5 text-left"
                      >
                        {defaultThumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={defaultThumb}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-accent-ink/15 object-cover object-top"
                          />
                        ) : null}
                        <span className="font-display text-base font-bold text-foreground">
                          {character.name}
                        </span>
                      </button>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Presets | History tabs */}
                        <div
                          role="tablist"
                          className="inline-flex rounded-full border border-accent-ink/15 bg-paper p-0.5"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={lookMode === "presets"}
                            onClick={() => {
                              setActiveCharId(character.id);
                              setLookModeByChar((prev) => ({
                                ...prev,
                                [character.id]: "presets",
                              }));
                            }}
                            className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                              lookMode === "presets"
                                ? "bg-accent-ink text-lime"
                                : "text-muted hover:text-foreground"
                            }`}
                          >
                            {isEn
                              ? `Presets (${1 + presets.length})`
                              : `預設造型 (${1 + presets.length})`}
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={lookMode === "history"}
                            onClick={() => {
                              setActiveCharId(character.id);
                              setLookModeByChar((prev) => ({
                                ...prev,
                                [character.id]: "history",
                              }));
                            }}
                            className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                              lookMode === "history"
                                ? "bg-accent-ink text-lime"
                                : "text-muted hover:text-foreground"
                            }`}
                          >
                            {isEn
                              ? `History (${historyVersions.length})`
                              : `歷史造型 (${historyVersions.length})`}
                          </button>
                        </div>

                        {/* Ad-hoc change outfit */}
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setActiveCharId(character.id);
                            setManagingCharId(character.id);
                          }}
                          className="cursor-pointer rounded-full border border-accent-ink bg-lime/65 px-3 py-1 text-xs font-bold text-accent-ink transition hover:bg-lime"
                        >
                          {isEn ? "+ Change outfit" : "+ 臨時換裝"}
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      lookMode === "presets" ? (
                        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                          {/* Default Blueprint Card */}
                          {defaultSheet ? (
                            <button
                              type="button"
                              disabled={full}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                selectCharacterWithOption(character.id, {
                                  versionId: defaultSheet.id,
                                });
                              }}
                              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                                defaultSelected
                                  ? "border-accent-ink bg-accent-ink text-paper"
                                  : "border-accent-ink/15 bg-white hover:border-accent-ink/40"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {defaultThumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={defaultThumb}
                                  alt=""
                                  className="h-14 w-14 shrink-0 rounded-xl border border-accent-ink/10 bg-white object-cover object-top"
                                />
                              ) : null}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold">
                                  {t("brief.castPicker.defaultLookBadge")}
                                </span>
                                <span
                                  className={`mt-0.5 block text-[11px] ${
                                    defaultSelected ? "text-paper/75" : "text-muted"
                                  }`}
                                >
                                  {character.name}
                                </span>
                              </span>
                            </button>
                          ) : null}

                          {/* Saved Presets Cards */}
                          {presets.map((preset) => {
                            const isPresetSelected =
                              charSelected &&
                              activeSelection?.presetId === preset.id;
                            const thumb =
                              preset.portraitUrl ||
                              preset.profileUrl ||
                              preset.blueprintUrl ||
                              defaultThumb;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                disabled={full}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  selectCharacterWithOption(character.id, {
                                    versionId: preset.versionId,
                                    presetId: preset.id,
                                    presetName: preset.name,
                                  });
                                }}
                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                                  isPresetSelected
                                    ? "border-accent-ink bg-accent-ink text-paper"
                                    : "border-accent-ink/15 bg-white hover:border-accent-ink/40"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="h-14 w-14 shrink-0 rounded-xl border border-accent-ink/10 bg-white object-cover object-top"
                                  />
                                ) : null}
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-bold">
                                    {preset.name}
                                  </span>
                                  {preset.editInstruction ? (
                                    <span
                                      className={`mt-0.5 block truncate text-[11px] ${
                                        isPresetSelected
                                          ? "text-paper/75"
                                          : "text-muted"
                                      }`}
                                    >
                                      {preset.editInstruction}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        /* History Versions Grid */
                        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                          {historyVersions.map((ver) => {
                            const isVerSelected =
                              charSelected &&
                              !activeSelection?.presetId &&
                              activeSelection?.versionId === ver.id;
                            const thumb =
                              ver.portraitUrl ||
                              ver.profileUrl ||
                              ver.blueprintUrl ||
                              defaultThumb;
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
                                disabled={full}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  selectCharacterWithOption(character.id, {
                                    versionId: ver.id,
                                    presetName: label,
                                  });
                                }}
                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                                  isVerSelected
                                    ? "border-accent-ink bg-accent-ink text-paper"
                                    : "border-accent-ink/15 bg-white hover:border-accent-ink/40"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="h-14 w-14 shrink-0 rounded-xl border border-accent-ink/10 bg-white object-cover object-top"
                                  />
                                ) : null}
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-bold">
                                    {label}
                                  </span>
                                  <span
                                    className={`mt-0.5 block truncate text-[11px] ${
                                      isVerSelected ? "text-paper/75" : "text-muted"
                                    }`}
                                  >
                                    v{ver.number} · {new Date(ver.createdAt).toLocaleDateString()}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-accent-ink/10 bg-paper px-6 py-3.5">
          {characters[0] ? (
            <button
              type="button"
              onClick={() =>
                setManagingCharId(value[0] || activeCharId || characters[0]!.id)
              }
              className="inline-flex h-9 cursor-pointer items-center rounded-full border border-accent-ink bg-lime/65 px-4 text-xs font-bold text-accent-ink transition hover:-translate-y-0.5 hover:bg-lime"
            >
              {isEn ? "Change outfit" : "更換穿搭"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 cursor-pointer items-center rounded-full bg-accent-ink px-5 text-xs font-bold text-lime transition hover:-translate-y-0.5"
          >
            {t("brief.castPicker.doneButton")}
          </button>
        </div>
      </div>

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
