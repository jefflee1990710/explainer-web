"use client";

import { CHARACTER_SPEC_FIELDS, type CharacterSpec, type CharacterSpecField } from "@/model/character-spec";
import { useI18n } from "@/presentation/components/i18n-provider";

const FIELD_KEYS: Record<CharacterSpecField, string> = {
  identity: "characters.specIdentity",
  face: "characters.specFace",
  hair: "characters.specHair",
  skinTone: "characters.specSkinTone",
  body: "characters.specBody",
  marks: "characters.specMarks",
  outfit: "characters.specOutfit",
  notes: "characters.specNotes",
};

// Appearance notes the AI read from the photos, as a compact labelled list with the palette.
export function CharacterSpecList({ spec }: { spec: CharacterSpec }) {
  const { t } = useI18n();
  const rows = CHARACTER_SPEC_FIELDS.filter((field) => spec[field]);
  return (
    <div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
        {rows.map((field) => (
          <div key={field} className="contents">
            <dt className="font-semibold uppercase tracking-[0.12em] text-muted">{t(FIELD_KEYS[field])}</dt>
            <dd className="text-foreground/85">{spec[field]}</dd>
          </div>
        ))}
      </dl>
      {spec.palette.length ? (
        <div className="mt-2 flex items-center gap-1.5" aria-label={t("characters.specPalette")}>
          {spec.palette.map((hex) => (
            <span
              key={hex}
              title={hex}
              className="h-4 w-4 rounded-full border border-accent-ink/15"
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
