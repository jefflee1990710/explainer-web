"use client";

import type { PublicCharacterPreset } from "@/presentation/serialize";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicLifeCharacter, PublicLifePreset } from "@/service/character/life";

// Look pinned for the next life post. Null versionId means the character's default blueprint.
export type LifeLookSelection = {
  versionId: string | null;
  presetId: string | null;
  thumbUrl: string | null;
};

export const EMPTY_LIFE_LOOK: LifeLookSelection = {
  versionId: null,
  presetId: null,
  thumbUrl: null,
};

// Presets coming back from the wardrobe dialog use the full character serializer.
export function lifePresetsFromPublic(presets: PublicCharacterPreset[]): PublicLifePreset[] {
  return [...presets]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .map((preset) => ({
      id: preset.id,
      name: preset.name,
      versionId: preset.versionId,
      thumbUrl: preset.portraitUrl || preset.profileUrl || preset.blueprintUrl || null,
      detail: preset.editInstruction?.trim() || null,
    }));
}

// Clickable outfit cards under the selected character: default look, then each saved preset.
export function LifePresetTree({
  character,
  look,
  disabled,
  onSelectDefault,
  onSelectPreset,
  onManage,
}: {
  character: PublicLifeCharacter;
  look: LifeLookSelection;
  disabled?: boolean;
  onSelectDefault: () => void;
  onSelectPreset: (preset: PublicLifePreset) => void;
  onManage: () => void;
}) {
  const { t } = useI18n();
  const pinned =
    character.presets.find((preset) => preset.id === look.presetId) ||
    (look.versionId
      ? character.presets.find((preset) => preset.versionId === look.versionId)
      : undefined);
  const defaultActive = !look.versionId;
  const customActive = Boolean(look.versionId) && !pinned;

  return (
    <section
      aria-label={t("life.presetHeading")}
      className="shrink-0 rounded-2xl border border-accent-ink/10 bg-paper/90 px-3 py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <LookThumb src={character.previewUrl} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              {t("life.presetHeading")}
            </p>
            <p className="truncate text-sm font-bold">{character.name}</p>
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
        className="mt-2 flex gap-2 overflow-x-auto pb-1"
      >
        <OutfitCard
          active={defaultActive}
          disabled={disabled}
          thumb={character.previewUrl}
          label={t("life.defaultLook")}
          onSelect={onSelectDefault}
        />
        {customActive ? (
          <OutfitCard
            active
            disabled={disabled}
            thumb={look.thumbUrl}
            label={t("life.selectedLook")}
            onSelect={() => {}}
          />
        ) : null}
        {character.presets.map((preset) => (
          <OutfitCard
            key={preset.id}
            active={pinned?.id === preset.id}
            disabled={disabled}
            thumb={preset.thumbUrl}
            label={preset.name}
            detail={preset.detail}
            onSelect={() => onSelectPreset(preset)}
          />
        ))}
      </div>

      {character.presets.length === 0 ? (
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
  detail,
  onSelect,
}: {
  active: boolean;
  disabled?: boolean;
  thumb: string | null;
  label: string;
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
      className="flex w-[7rem] shrink-0 cursor-pointer flex-col text-left text-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={`relative block overflow-hidden rounded-[1.75rem] border bg-zinc-200 ${
          active
            ? "border-accent-ink shadow-[2px_2px_0_0_#12141c]"
            : "border-accent-ink/12 hover:border-accent-ink/40"
        }`}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="aspect-[3/4] w-full object-cover object-top" />
        ) : (
          <span className="grid aspect-[3/4] w-full place-items-center text-xs text-muted">—</span>
        )}
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
