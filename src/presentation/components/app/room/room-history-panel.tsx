"use client";

import { useMemo, useState } from "react";
import { SaveCharacterPresetDialog } from "@/presentation/components/app/characters/[id]/character-presets-bar";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter, PublicCharacterVersion } from "@/presentation/serialize";

// The fitting room lists only the character's most recent looks.
export const ROOM_HISTORY_LIMIT = 20;

// Newest first, capped to the room history limit.
export function recentRoomVersions<T extends { createdAt: string }>(versions: readonly T[], limit = ROOM_HISTORY_LIMIT): T[] {
  return [...versions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

type Tab = "presets" | "history";

// Right column: Presets / History tabs. Clicking an entry loads that look into the preview and wardrobe.
export function RoomHistoryPanel({
  character,
  activeVersion,
  styleVersions,
  pending,
  onSelectVersion,
  onSavePreset,
  onDeletePreset,
}: {
  character: PublicCharacter;
  activeVersion: PublicCharacterVersion;
  styleVersions: PublicCharacterVersion[];
  pending: string;
  onSelectVersion: (versionId: string) => void;
  onSavePreset: (versionId: string, name: string) => Promise<boolean>;
  onDeletePreset: (presetId: string) => void;
}) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>("history");
  const [savingVersion, setSavingVersion] = useState<PublicCharacterVersion | null>(null);
  const presets = (character.presets || []).filter((preset) => preset.styleId === activeVersion.styleId);
  const history = useMemo(() => recentRoomVersions(styleVersions), [styleVersions]);
  const presetNamesByVersion = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const preset of presets) map.set(preset.versionId, [...(map.get(preset.versionId) || []), preset.name]);
    return map;
  }, [presets]);
  const canSaveActive = activeVersion.status === "completed" && Boolean(activeVersion.blueprintUrl);

  return (
    <aside className="flex min-h-[20rem] flex-col overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/90 p-3 lg:min-h-0">
      <div role="tablist" className="flex shrink-0 items-center gap-1 rounded-full bg-accent-ink/5 p-1">
        {(["presets", "history"] as const).map((id) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition ${
                active ? "bg-accent-ink text-paper" : "text-muted hover:text-foreground"
              }`}
            >
              {id === "presets"
                ? t("characters.roomTabPresets", { n: presets.length })
                : t("characters.roomTabHistory", { n: history.length })}
            </button>
          );
        })}
      </div>

      {tab === "presets" ? (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
          {canSaveActive ? (
            <button
              type="button"
              disabled={pending !== ""}
              onClick={() => setSavingVersion(activeVersion)}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full border border-accent-ink bg-accent-ink px-3 text-xs font-bold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              + {t("characters.savePresetButton")}
            </button>
          ) : null}
          {presets.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-muted">{t("characters.roomPresetsEmpty")}</p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
              {presets.map((preset) => {
                const selected = preset.versionId === activeVersion.id;
                const thumb = preset.portraitUrl || preset.profileUrl || preset.blueprintUrl;
                return (
                  <li key={preset.id} className="relative">
                    <button
                      type="button"
                      onClick={() => onSelectVersion(preset.versionId)}
                      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border p-2 pr-8 text-left transition ${
                        selected
                          ? "border-accent-ink bg-accent-ink text-paper"
                          : "border-accent-ink/10 bg-paper hover:border-accent-ink/30"
                      }`}
                    >
                      <Thumb src={thumb} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold">{preset.name}</span>
                        {preset.editInstruction ? (
                          <span className={`block truncate text-[11px] ${selected ? "text-paper/75" : "text-muted"}`}>
                            {preset.editInstruction}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={pending !== ""}
                      onClick={() => onDeletePreset(preset.id)}
                      aria-label={t("characters.deletePresetAria", { name: preset.name })}
                      className={`absolute top-1/2 right-2 grid h-5 w-5 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[12px] transition disabled:opacity-50 ${
                        selected ? "text-paper/75 hover:bg-paper/20 hover:text-paper" : "text-muted hover:bg-accent-ink/10 hover:text-foreground"
                      }`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
          <p className="shrink-0 px-1 text-[11px] text-muted">
            {t("characters.roomHistoryLimit", { n: ROOM_HISTORY_LIMIT })}
          </p>
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
            {history.map((ver) => {
              const current = ver.id === activeVersion.id;
              const busy = ver.status === "queued" || ver.status === "in_progress";
              const canSave = ver.status === "completed" && Boolean(ver.blueprintUrl);
              const names = presetNamesByVersion.get(ver.id) || [];
              return (
                <li
                  key={ver.id}
                  className={`flex items-center gap-2.5 rounded-xl border p-2 transition ${
                    current ? "border-accent-ink bg-accent-ink/[0.05]" : "border-accent-ink/10 bg-paper hover:border-accent-ink/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectVersion(ver.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                  >
                    <Thumb src={ver.portraitUrl || ver.profileUrl || ver.blueprintUrl} busy={busy} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                        {new Date(ver.createdAt).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
                        {current ? (
                          <span className="rounded-full bg-accent-ink px-1.5 py-px text-[9px] font-bold text-paper">
                            {t("characters.historyActiveBadge")}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs font-semibold">
                        {ver.editInstruction?.trim() || t("characters.versionOriginal")}
                      </span>
                      {names.length ? (
                        <span className="block truncate text-[10px] font-bold text-muted">★ {names.join(", ")}</span>
                      ) : null}
                    </span>
                  </button>
                  {canSave ? (
                    <button
                      type="button"
                      disabled={pending !== ""}
                      onClick={() => setSavingVersion(ver)}
                      aria-label={t("characters.savePresetButton")}
                      title={t("characters.savePresetButton")}
                      className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/20 text-sm font-bold text-muted transition hover:border-accent-ink hover:text-foreground disabled:opacity-50"
                    >
                      ★
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {savingVersion ? (
        <SaveCharacterPresetDialog
          defaultSuggestion={savingVersion.editInstruction || ""}
          saving={pending === "save-preset"}
          onClose={() => setSavingVersion(null)}
          onSubmit={async (name) => {
            const ok = await onSavePreset(savingVersion.id, name);
            if (ok) {
              setSavingVersion(null);
              setTab("presets");
            }
          }}
        />
      ) : null}
    </aside>
  );
}

// Face-cropped thumbnail, or a spinner while the look is still drawing.
function Thumb({ src, busy }: { src?: string; busy?: boolean }) {
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-accent-ink/10 bg-zinc-100 text-xs text-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover object-top" />
      ) : busy ? (
        <Spinner className="h-4 w-4" />
      ) : (
        "—"
      )}
    </span>
  );
}
