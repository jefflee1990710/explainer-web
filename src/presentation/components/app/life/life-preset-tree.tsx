"use client";

import { useState } from "react";
import { isStyleId, type StyleId } from "@/model/style-id";
import type { PublicCharacter, PublicCharacterPreset } from "@/presentation/serialize";
import { useI18n } from "@/presentation/components/i18n-provider";
import type {
  PublicLifeCharacter,
  PublicLifePreset,
  PublicLifeStyleLook,
} from "@/service/character/life";
import { localizedStyleName } from "@/util/style-i18n";

// Look pinned for the next life post. Null versionId means the character's default blueprint.
export type LifeLookSelection = {
  versionId: string | null;
  presetId: string | null;
  thumbUrl: string | null;
  styleId?: string | null;
};

export const EMPTY_LIFE_LOOK: LifeLookSelection = {
  versionId: null,
  presetId: null,
  thumbUrl: null,
  styleId: null,
};

function cleanDetailText(editInstruction?: string): string | null {
  if (!editInstruction) return null;
  const cleaned = editInstruction
    .replace(/\s*Isolated wardrobe piece [\w-]+\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

export function lifeStylesFromPublic(character: PublicCharacter): PublicLifeStyleLook[] {
  const out: PublicLifeStyleLook[] = [];
  for (const styleId of character.styleIds) {
    const defaultVerId = character.defaultByStyle[styleId];
    const completedForStyle = character.versions.filter(
      (v) => (v.styleId || character.styleId) === styleId && v.status === "completed" && Boolean(v.blueprintUrl),
    );
    const version =
      completedForStyle.find((v) => v.id === defaultVerId) ?? completedForStyle[0];
    if (!version) continue;
    out.push({
      styleId,
      versionId: version.id,
      thumbUrl: version.portraitUrl || version.profileUrl || version.blueprintUrl || null,
      detail: cleanDetailText(version.editInstruction),
    });
  }
  return out;
}

// Presets coming back from the wardrobe dialog use the full character serializer.
export function lifePresetsFromPublic(
  presets: PublicCharacterPreset[],
  character?: PublicCharacter,
): PublicLifePreset[] {
  const explicit: PublicLifePreset[] = [...presets]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .map((preset) => ({
      id: preset.id,
      name: preset.name,
      versionId: preset.versionId,
      styleId: preset.styleId || character?.styleId || "realistic",
      thumbUrl: preset.portraitUrl || preset.profileUrl || preset.blueprintUrl || null,
      detail: cleanDetailText(preset.editInstruction),
    }));

  if (!character) return explicit;

  const styleDefaultVersionIds = new Set(
    lifeStylesFromPublic(character).map((s) => s.versionId),
  );
  const presetVersionIds = new Set(explicit.map((p) => p.versionId));

  const extraVersions: PublicLifePreset[] = [...character.versions]
    .filter(
      (v) =>
        v.status === "completed" &&
        Boolean(v.blueprintUrl) &&
        !styleDefaultVersionIds.has(v.id) &&
        !presetVersionIds.has(v.id),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .map((v) => {
      const styleId = v.styleId || character.styleId || "realistic";
      const detail = cleanDetailText(v.editInstruction);
      const shortName = detail
        ? detail.replace(/^(?:Top|Pants|Hair|Shoes|Accessory):\s*/i, "").slice(0, 28)
        : "Original look";
      return {
        id: `ver_${v.id}`,
        name: shortName,
        versionId: v.id,
        styleId,
        thumbUrl: v.portraitUrl || v.profileUrl || v.blueprintUrl || null,
        detail,
      };
    });

  return [...explicit, ...extraVersions];
}

// Clickable style pills & outfit cards under the selected character: all supported styles on top, then saved presets.
export function LifePresetTree({
  character,
  look,
  disabled,
  onSelectDefault,
  onSelectStyle,
  onSelectPreset,
  onManage,
}: {
  character: PublicLifeCharacter;
  look: LifeLookSelection;
  disabled?: boolean;
  onSelectDefault: () => void;
  onSelectStyle?: (styleLook: PublicLifeStyleLook) => void;
  onSelectPreset: (preset: PublicLifePreset) => void;
  onManage: () => void;
}) {
  const { t } = useI18n();
  const [styleFilter, setStyleFilter] = useState<string>("all");

  const supportedStyles: PublicLifeStyleLook[] =
    character.styles && character.styles.length > 0
      ? character.styles
      : [
          {
            styleId: character.styleId || "realistic",
            versionId: "",
            thumbUrl: character.previewUrl,
            detail: null,
          },
        ];

  const getStyleLabel = (styleId: string) => {
    if (isStyleId(styleId)) {
      return t(`styles.${styleId as StyleId}`) || localizedStyleName(styleId as StyleId);
    }
    return styleId;
  };

  const activeStyleFilter =
    styleFilter !== "all" && supportedStyles.some((s) => s.styleId === styleFilter)
      ? styleFilter
      : "all";

  const visibleStyles =
    activeStyleFilter === "all"
      ? supportedStyles
      : supportedStyles.filter((s) => s.styleId === activeStyleFilter);

  const visiblePresets =
    activeStyleFilter === "all"
      ? character.presets
      : character.presets.filter((p) => !p.styleId || p.styleId === activeStyleFilter);

  const pinnedPreset =
    character.presets.find((preset) => preset.id === look.presetId) ||
    (look.versionId
      ? character.presets.find((preset) => preset.versionId === look.versionId && look.presetId)
      : undefined);

  const primaryStyle = supportedStyles[0];
  const isStyleCardActive = (styleLook: PublicLifeStyleLook, index: number) => {
    if (pinnedPreset) return false;
    if (!look.versionId) return index === 0;
    return look.versionId === styleLook.versionId;
  };

  const customActive =
    Boolean(look.versionId) &&
    !pinnedPreset &&
    !supportedStyles.some((s) => s.versionId === look.versionId);

  const activeThumb =
    look.thumbUrl ||
    (look.versionId
      ? supportedStyles.find((s) => s.versionId === look.versionId)?.thumbUrl
      : null) ||
    character.previewUrl;

  return (
    <section
      aria-label={t("life.presetHeading")}
      className="shrink-0 rounded-2xl border border-accent-ink/10 bg-paper/90 px-3 py-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <LookThumb src={activeThumb} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              {t("life.presetHeading")}
            </p>
            <p className="truncate text-sm font-bold">{character.name}</p>
          </div>

          {/* Supported Styles bar on top for this AI Influencer */}
          <div
            role="tablist"
            aria-label="Supported character styles"
            className="flex flex-wrap items-center gap-1.5 pl-1"
          >
            {supportedStyles.length > 1 ? (
              <button
                type="button"
                role="tab"
                aria-selected={activeStyleFilter === "all"}
                disabled={disabled}
                onClick={() => setStyleFilter("all")}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                  activeStyleFilter === "all"
                    ? "bg-accent-ink text-paper shadow-xs"
                    : "border border-accent-ink/15 bg-paper text-muted hover:border-accent-ink/40 hover:text-foreground"
                }`}
              >
                All Styles ({supportedStyles.length})
              </button>
            ) : null}
            {supportedStyles.map((styleLook, idx) => {
              const label = getStyleLabel(styleLook.styleId);
              const isSelectedStyle =
                activeStyleFilter === styleLook.styleId ||
                (activeStyleFilter === "all" && isStyleCardActive(styleLook, idx));
              return (
                <button
                  key={styleLook.styleId}
                  type="button"
                  role="tab"
                  aria-selected={isSelectedStyle}
                  disabled={disabled}
                  onClick={() => {
                    setStyleFilter(
                      supportedStyles.length > 1 && activeStyleFilter === styleLook.styleId
                        ? "all"
                        : styleLook.styleId,
                    );
                    if (idx === 0 && !styleLook.versionId) {
                      onSelectDefault();
                    } else if (onSelectStyle) {
                      onSelectStyle(styleLook);
                    }
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    isSelectedStyle
                      ? "bg-accent-ink text-lime shadow-xs"
                      : "border border-accent-ink/15 bg-paper text-foreground hover:border-accent-ink/40"
                  }`}
                >
                  {styleLook.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={styleLook.thumbUrl}
                      alt=""
                      className="h-4 w-4 rounded-full object-cover object-top ring-1 ring-white/30"
                    />
                  ) : null}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onManage}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border border-accent-ink/20 bg-paper px-3 text-[11px] font-bold text-foreground transition hover:border-accent-ink"
        >
          {t("life.manageDress")}
        </button>
      </div>

      <div
        role="radiogroup"
        aria-label={t("life.presetHeading")}
        className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1"
      >
        {visibleStyles.map((styleLook) => {
          const globalIdx = supportedStyles.findIndex((s) => s.styleId === styleLook.styleId);
          const active = isStyleCardActive(styleLook, globalIdx);
          const styleName = getStyleLabel(styleLook.styleId);
          return (
            <OutfitCard
              key={`style-${styleLook.styleId}`}
              active={active}
              disabled={disabled}
              thumb={styleLook.thumbUrl ?? character.previewUrl}
              label={
                supportedStyles.length > 1
                  ? styleName
                  : `${t("life.defaultLook")} · ${styleName}`
              }
              badge={styleName}
              detail={styleLook.detail || `${styleName} (${t("life.defaultLook")})`}
              onSelect={() => {
                if (globalIdx === 0 && (!primaryStyle?.versionId || styleLook.versionId === primaryStyle.versionId)) {
                  onSelectDefault();
                } else if (onSelectStyle) {
                  onSelectStyle(styleLook);
                }
              }}
            />
          );
        })}

        {customActive ? (
          <OutfitCard
            active
            disabled={disabled}
            thumb={look.thumbUrl}
            label={t("life.selectedLook")}
            badge={look.styleId ? getStyleLabel(look.styleId) : undefined}
            onSelect={() => {}}
          />
        ) : null}

        {visiblePresets.map((preset) => {
          const styleName = preset.styleId ? getStyleLabel(preset.styleId) : undefined;
          return (
            <OutfitCard
              key={preset.id}
              active={pinnedPreset?.id === preset.id}
              disabled={disabled}
              thumb={preset.thumbUrl}
              label={preset.name}
              badge={styleName}
              detail={preset.detail}
              onSelect={() => onSelectPreset(preset)}
            />
          );
        })}
      </div>

      {supportedStyles.length <= 1 && character.presets.length === 0 ? (
        <p className="mt-1.5 pl-4 text-[11px] text-muted">{t("life.presetsEmpty")}</p>
      ) : null}
    </section>
  );
}

function OutfitCard({
  active,
  disabled,
  thumb,
  label,
  badge,
  detail,
  onSelect,
}: {
  active: boolean;
  disabled?: boolean;
  thumb: string | null;
  label: string;
  badge?: string;
  detail?: string | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onSelect}
      title={detail || label}
      className="flex w-[7.25rem] shrink-0 cursor-pointer flex-col text-left text-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={`relative block overflow-hidden rounded-[1.5rem] border bg-zinc-200 ${
          active
            ? "border-accent-ink ring-2 ring-accent-ink/20 shadow-[2px_2px_0_0_#12141c]"
            : "border-accent-ink/12 hover:border-accent-ink/40"
        }`}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="aspect-[3/4] w-full object-cover object-top" />
        ) : (
          <span className="grid aspect-[3/4] w-full place-items-center text-xs text-muted">—</span>
        )}
        {badge ? (
          <span className="absolute top-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
            {badge}
          </span>
        ) : null}
      </span>
      {/* Label sits outside the clipped photo so rounded corners cannot eat the first letters. */}
      <span className="mt-1.5 line-clamp-2 min-h-[2rem] px-0.5 text-center text-[11px] font-semibold leading-4">
        {label}
      </span>
    </button>
  );
}

function LookThumb({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-8 w-8 shrink-0 rounded-lg border border-accent-ink/10 bg-white object-cover object-top"
    />
  ) : (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-200 text-[10px] text-muted">—</span>
  );
}
