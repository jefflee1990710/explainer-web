"use client";

import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter, PublicCharacterVersion } from "@/presentation/serialize";

function versionStatusLabel(
  status: PublicCharacterVersion["status"],
  t: ReturnType<typeof useI18n>["t"],
) {
  switch (status) {
    case "queued":
      return t("characters.versionStatusQueued");
    case "in_progress":
      return t("characters.versionStatusInProgress");
    case "completed":
      return t("characters.versionStatusCompleted");
    case "failed":
      return t("characters.versionStatusFailed");
  }
}

// Left pane: every version newest first; the default is badged.
export function VersionList({
  character,
  styleId,
  selectedId,
  onSelect,
}: {
  character: PublicCharacter;
  styleId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const versions = character.versions.filter((version) => version.styleId === styleId);
  return (
    <div className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-3 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)]">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {t("characters.versionsHeading")}
      </p>
      {versions.length === 0 ? (
        <p className="px-2 text-sm text-muted">{t("characters.noVersions")}</p>
      ) : null}
      <ul className="space-y-1">
        {versions.map((version) => {
          const selected = version.id === selectedId;
          const isDefault = version.id === character.defaultVersionId;
          const busy = version.status === "queued" || version.status === "in_progress";
          return (
            <li key={version.id}>
              <button
                type="button"
                onClick={() => onSelect(version.id)}
                aria-current={selected ? "true" : undefined}
                className={`flex min-h-[44px] w-full cursor-pointer flex-col items-start gap-0.5 rounded-xl px-2 py-2 text-left transition ${
                  selected ? "bg-accent-ink/5" : "hover:bg-accent-ink/5"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
                  v{version.number}
                  {isDefault ? (
                    <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold">
                      {t("characters.defaultBadge")}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`line-clamp-2 text-xs ${
                    version.status === "failed" ? "text-accent" : "text-muted"
                  }`}
                  title={version.editInstruction || undefined}
                >
                  {version.editInstruction?.trim() || t("characters.versionOriginal")}
                  {version.status === "completed" ? "" : ` · ${versionStatusLabel(version.status, t)}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
