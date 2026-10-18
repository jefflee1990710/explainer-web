"use client";

import {
  PERSONA_HUMOR,
  PERSONA_PACE,
  PERSONA_WARMTH,
  type PersonaHumor,
  type PersonaPace,
  type PersonaWarmth,
} from "@/model/character-persona";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  draftFromPersona,
  randomCharacterPersona,
  type PersonaDraft,
} from "@/service/character/persona";

const WARMTH_KEY = {
  warm: "persona.warmthWarm",
  direct: "persona.warmthDirect",
  sharp: "persona.warmthSharp",
} as const;

const PACE_KEY = {
  slow: "persona.paceSlow",
  even: "persona.paceEven",
  quick: "persona.paceQuick",
} as const;

const HUMOR_KEY = {
  straight: "persona.humorStraight",
  playful: "persona.humorPlayful",
  teasing: "persona.humorTeasing",
} as const;

// City, tone, and hobbies. Shared by create and the character page.
export function CharacterPersonaFields({
  draft,
  onChange,
  disabled,
  compact = false,
}: {
  draft: PersonaDraft;
  onChange: (next: PersonaDraft) => void;
  disabled?: boolean;
  // Create screen keeps the axes on one row so the look picker still fits.
  compact?: boolean;
}) {
  const { t } = useI18n();

  function setAxis<K extends "warmth" | "pace" | "humor">(key: K, value: PersonaDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs font-semibold text-muted">
          {t("persona.city")}
          <input
            value={draft.city}
            maxLength={40}
            disabled={disabled}
            placeholder={t("persona.cityPlaceholder")}
            onChange={(event) => onChange({ ...draft, city: event.target.value })}
            className="h-9 rounded-full border border-accent-ink/15 bg-paper px-3 text-sm font-medium text-foreground"
          />
        </label>
        <label className="flex min-w-48 flex-[2] flex-col gap-1 text-xs font-semibold text-muted">
          {t("persona.summary")}
          <input
            value={draft.summary}
            maxLength={80}
            disabled={disabled}
            placeholder={t("persona.summaryPlaceholder")}
            onChange={(event) => onChange({ ...draft, summary: event.target.value })}
            className="h-9 rounded-full border border-accent-ink/15 bg-paper px-3 text-sm font-medium text-foreground"
          />
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(draftFromPersona(randomCharacterPersona()))}
          className="inline-flex h-9 cursor-pointer items-center rounded-full border border-accent-ink/20 bg-paper px-3 text-xs font-bold text-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("persona.random")}
        </button>
      </div>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        {t("persona.interests")}
        <input
          value={draft.interests}
          disabled={disabled}
          placeholder={t("persona.interestsPlaceholder")}
          onChange={(event) => onChange({ ...draft, interests: event.target.value })}
          className="h-9 rounded-full border border-accent-ink/15 bg-paper px-3 text-sm font-medium text-foreground"
        />
      </label>
      <div className={compact ? "flex flex-wrap gap-2" : "flex flex-col gap-3"}>
        <AxisRow
          label={t("persona.warmth")}
          values={PERSONA_WARMTH}
          current={draft.warmth}
          disabled={disabled}
          labelFor={(value) => t(WARMTH_KEY[value])}
          onPick={(value) => setAxis("warmth", value)}
        />
        <AxisRow
          label={t("persona.pace")}
          values={PERSONA_PACE}
          current={draft.pace}
          disabled={disabled}
          labelFor={(value) => t(PACE_KEY[value])}
          onPick={(value) => setAxis("pace", value)}
        />
        <AxisRow
          label={t("persona.humor")}
          values={PERSONA_HUMOR}
          current={draft.humor}
          disabled={disabled}
          labelFor={(value) => t(HUMOR_KEY[value])}
          onPick={(value) => setAxis("humor", value)}
        />
      </div>
    </div>
  );
}

function AxisRow<T extends PersonaWarmth | PersonaPace | PersonaHumor>({
  label,
  values,
  current,
  disabled,
  labelFor,
  onPick,
}: {
  label: string;
  values: readonly T[];
  current: T;
  disabled?: boolean;
  labelFor: (value: T) => string;
  onPick: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 text-xs font-semibold text-muted">{label}</span>
      <div className="inline-flex rounded-full border border-accent-ink/10 bg-paper p-0.5" role="radiogroup" aria-label={label}>
        {values.map((value) => {
          const active = value === current;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onPick(value)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                active ? "bg-accent-ink text-paper" : "text-muted hover:text-foreground"
              }`}
            >
              {labelFor(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
