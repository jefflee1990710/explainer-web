"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { AnyCharacterLookPart } from "@/service/character/character-look";

// Single-select cut row (jeans, mini skirt, bob). Sits above the style tabs.
export function LookSilhouetteChips({
  part,
  kinds,
  value,
  onChange,
}: {
  part: AnyCharacterLookPart;
  kinds: readonly string[];
  value: string;
  onChange: (kind: string) => void;
}) {
  const { t } = useI18n();
  if (!kinds.length) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold tracking-wide text-muted">{t("characters.look.silhouettesLabel")}</p>
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label={t("characters.look.silhouettesLabel")}>
        <SilhouetteChip
          label={t("characters.look.tabs.all")}
          active={value === "all"}
          onClick={() => onChange("all")}
        />
        {kinds.map((kind) => (
          <SilhouetteChip
            key={kind}
            label={t(`characters.look.silhouettes.${part}.${kind}`)}
            active={value === kind}
            onClick={() => onChange(kind)}
          />
        ))}
      </div>
    </div>
  );
}

function SilhouetteChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "bg-accent-ink text-paper"
          : "border border-accent-ink/15 bg-paper text-muted hover:border-accent-ink/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
