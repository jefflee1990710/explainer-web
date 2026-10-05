"use client";

import { useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter, PublicCharacterVersion } from "@/presentation/serialize";
import { FRAME_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Root version holds the uploaded photos. Later versions point at a parent sheet.
function hasOriginalPhoto(character: PublicCharacter, version: PublicCharacterVersion) {
  const byId = new Map(character.versions.map((item) => [item.id, item]));
  let current: PublicCharacterVersion | undefined = version;
  const seen = new Set<string>();
  while (current?.parentVersionId) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    current = byId.get(current.parentVersionId);
  }
  const root = current ?? version;
  return Boolean(root.referenceImageUrl) && !root.parentVersionId;
}

// Right pane: big preview + set-default / edit / retry actions.
export function VersionDetail({
  character,
  version,
  credits,
  subscribed,
  pending,
  error,
  onSetDefault,
  onEdit,
  onRetry,
}: {
  character: PublicCharacter;
  version: PublicCharacterVersion;
  credits: number;
  subscribed: boolean;
  pending: string;
  error: string;
  onSetDefault: () => void;
  onEdit: (instruction: string) => void;
  onRetry: () => void;
}) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState("");
  const isDefault = character.defaultByStyle[version.styleId] === version.id;
  const busy = version.status === "queued" || version.status === "in_progress";
  const short = !subscribed || credits < FRAME_COST;

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim()) return;
    onEdit(instruction.trim());
    setInstruction("");
    setEditing(false);
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.08)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          v{version.number}
          {isDefault ? (
            <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-xs font-bold">
              {t("characters.defaultBadge")}
            </span>
          ) : null}
        </h2>
        <p className="text-xs text-muted">
          {new Date(version.createdAt).toLocaleString(locale)}
        </p>
      </div>

      {/* The pane keeps its height. The sheet stays fully visible inside it. */}
      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[1.25rem] border border-accent-ink/10 bg-white">
        {version.blueprintUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={version.blueprintUrl}
            alt={t("characters.versionBlueprintAlt", { name: character.name, n: version.number })}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 grid min-h-40 w-full place-items-center bg-accent-ink/5 text-sm text-muted">
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> {t("characters.blueprintGenerating")}
              </span>
            ) : (
              <span className="text-accent">
                {version.error ? translateAppError(version.error, t) : t("characters.versionFailedFallback")}
              </span>
            )}
          </div>
        )}
      </div>

      <dl className="mt-4 max-h-28 shrink-0 space-y-2 overflow-y-auto text-sm">
        {version.editInstruction ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              {t("characters.changeThisRun")}
            </dt>
            <dd className="mt-1">{version.editInstruction}</dd>
          </div>
        ) : null}
        {version.prompt ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              {t("characters.characterDescription")}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-muted">{version.prompt}</dd>
          </div>
        ) : version.referenceImageUrl ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              {t("characters.characterSource")}
            </dt>
            <dd className="mt-1 text-muted">{t("characters.characterFromReferences")}</dd>
          </div>
        ) : null}
      </dl>

      {error ? (
        <p role="alert" className="mt-4 shrink-0 text-sm font-medium text-accent">
          {translateAppError(error, t)}
        </p>
      ) : null}

      <div className="mt-5 flex shrink-0 flex-wrap items-center gap-3 border-t border-accent-ink/10 pt-5">
        {version.status === "completed" && !isDefault ? (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={pending !== ""}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {pending === "default" ? <Spinner className="h-4 w-4" /> : null}
            {t("characters.setDefault")}
          </button>
        ) : null}
        {version.status === "completed" ? (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            disabled={pending !== ""}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {t("characters.editFromVersion")}
          </button>
        ) : null}
        {version.status === "failed" ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={pending !== ""}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-4 text-sm font-semibold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {pending === "retry" ? <Spinner className="h-4 w-4" /> : null}
            {t("characters.retryCredits", { cost: FRAME_COST })}
          </button>
        ) : null}
        <p className="text-xs text-muted">
          {short
            ? subscribed
              ? t("characters.creditsShortSubscribed", { remaining: credits })
              : t("characters.creditsNeedSubscribe")
            : t("characters.creditsRemaining", { remaining: credits })}
        </p>
      </div>

      {editing ? (
        <form onSubmit={submitEdit} className="mt-4 shrink-0 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("characters.editWhatLabel")}</span>
            {hasOriginalPhoto(character, version) ? (
              <span className="mb-1.5 block text-xs leading-5 text-muted">{t("characters.editKeepsOriginal")}</span>
            ) : null}
            <textarea
              rows={3}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder={t("characters.editWhatPlaceholder")}
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!instruction.trim() || pending !== ""}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "edit" ? <Spinner className="h-4 w-4" /> : null}
              {t("characters.generateNewVersion", { cost: FRAME_COST })}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-[44px] cursor-pointer rounded-full px-3 text-sm font-semibold text-muted hover:text-foreground"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
