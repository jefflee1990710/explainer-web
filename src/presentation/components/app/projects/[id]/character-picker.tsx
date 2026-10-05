"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { castPickStatus } from "@/presentation/components/app/projects/[id]/cast-pick-status";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter } from "@/presentation/serialize";

// Dropdown of characters in the current style. Optional directors allow None
// and several picks; a required count locks the selection size.
export function CharacterPicker({
  characters,
  styleId,
  value,
  onChange,
  disabled,
  max = 4,
  required = 0,
}: {
  characters: PublicCharacter[];
  styleId?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  max?: number;
  required?: number;
}) {
  const { t } = useI18n();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const allowNone = required === 0;
  const multiple = max > 1;

  const anyReady = characters.some((character) => character.previewUrl);
  const ready = characters.filter((character) => {
    const styles = character.styleIds?.length ? character.styleIds : [character.styleId];
    const sheet = blueprintForStyle(character, styleId);
    return Boolean(sheet) && (!styleId || styles.includes(styleId));
  });
  const selected = ready.filter((character) => value.includes(character.id));
  const pick = castPickStatus(value.length, required, max, t);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (required > 0 && ready.length < required) {
    return (
      <p className="text-sm font-medium text-accent">
        {ready.length === 0
          ? anyReady
            ? t("brief.castPicker.errorNoStyleCharacters")
            : t("brief.castPicker.errorNone")
          : t("brief.castPicker.errorRequiredCount", { required, ready: ready.length })}
        <Link href="/app/characters" className="ml-1 font-semibold underline underline-offset-4">
          {t("brief.castPicker.linkCreate")}
        </Link>
      </p>
    );
  }

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    if (!multiple) {
      onChange([id]);
      setOpen(false);
      return;
    }
    if (value.length < max) onChange([...value, id]);
  }

  const summary =
    selected.length === 0
      ? allowNone
        ? t("brief.castPicker.none")
        : t("brief.castPicker.placeholder")
      : selected.map((character) => character.name).join(", ");

  return (
    <div>
      {/* Raise the open menu above the next form section. */}
      <div ref={rootRef} className={`relative ${open ? "z-30" : ""}`}>
        <button
          type="button"
          id={`${listboxId}-trigger`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-required={required > 0}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-accent-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {selected[0] ? (
            <CharacterThumb src={displayForStyle(selected[0], styleId)} />
          ) : (
            <EmptyThumb />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{summary}</span>
            {selected.length === 1 ? (
              <VersionLine version={sheetForStyle(selected[0], styleId)} muted />
            ) : null}
            {selected.length > 1 ? (
              <span className="mt-0.5 block text-xs text-muted">
                {t("brief.castPicker.selectedCount", { n: selected.length })}
              </span>
            ) : null}
          </span>
          <ChevronIcon open={open} />
        </button>

        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={t("brief.castPicker.aria")}
            aria-multiselectable={multiple || undefined}
            className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-accent-ink/15 bg-paper p-1 shadow-[4px_4px_0_0_rgba(18,20,28,0.08)]"
          >
            {allowNone ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected.length === 0}
                  onClick={() => {
                    onChange([]);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    selected.length === 0 ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
                  }`}
                >
                  <EmptyThumb />
                  {t("brief.castPicker.none")}
                </button>
              </li>
            ) : null}
            {ready.map((character) => {
              const active = value.includes(character.id);
              const full = !active && value.length >= max;
              return (
                <li key={character.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={disabled || full}
                    onClick={() => toggle(character.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${
                      active ? "bg-accent-ink text-paper" : "hover:bg-accent-ink/5"
                    }`}
                  >
                    <CharacterThumb src={displayForStyle(character, styleId)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{character.name}</span>
                      <VersionLine version={sheetForStyle(character, styleId)} muted={!active} inverted={active} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <p className={`mt-2 text-xs ${pick.ok ? "text-muted" : "font-medium text-accent"}`}>
        {ready.length === 0 ? t("brief.castPicker.errorNone") : pick.text}
        <Link href="/app/characters" className="ml-1 underline underline-offset-4">
          {ready.length === 0 ? t("brief.castPicker.linkCreate") : t("brief.castPicker.linkManage")}
        </Link>
      </p>
    </div>
  );
}

// Completed sheet for the video's style. Without a style, the character default.
function sheetForStyle(character: PublicCharacter, styleId?: string) {
  const versions = character.versions.filter((version) => {
    const id = version.styleId || character.styleId;
    return (
      (!styleId || id === styleId) &&
      version.status === "completed" &&
      Boolean(version.blueprintUrl)
    );
  });
  const preferred = styleId ? character.defaultByStyle[styleId] : character.defaultVersionId;
  return versions.find((version) => version.id === preferred) ?? versions[0] ?? null;
}

function blueprintForStyle(character: PublicCharacter, styleId?: string) {
  if (!styleId) return character.previewUrl;
  return sheetForStyle(character, styleId)?.blueprintUrl ?? null;
}

// Standing preview when the sheet has one; otherwise the full blueprint.
function displayForStyle(character: PublicCharacter, styleId?: string) {
  const sheet = sheetForStyle(character, styleId);
  return sheet?.profileUrl || sheet?.blueprintUrl || character.previewUrl || "";
}

function VersionLine({
  version,
  muted,
  inverted,
}: {
  version: PublicCharacter["versions"][number] | null;
  muted?: boolean;
  inverted?: boolean;
}) {
  if (!version) return null;
  return (
    <span className={`block text-xs ${inverted ? "text-paper/75" : muted ? "text-muted" : ""}`}>
      v{version.number}
    </span>
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
  return <span className="grid h-14 w-24 shrink-0 place-items-center rounded-md border border-dashed border-accent-ink/15 text-xs text-muted">—</span>;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
