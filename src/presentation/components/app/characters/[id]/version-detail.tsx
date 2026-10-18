"use client";

import { useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import { BlueprintBoard } from "@/presentation/components/app/characters/[id]/blueprint-board";
import { CharacterImagePreviewDialog } from "@/presentation/components/app/characters/[id]/character-image-preview-dialog";
import { CharacterSpecList } from "@/presentation/components/app/characters/[id]/character-spec-list";
import type { PublicCharacter, PublicCharacterVersion } from "@/presentation/serialize";
import { BLUEPRINT_COST, FRAME_COST } from "@/service/production-plan";
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

// Right pane: full-height preview + collapsible spec + always-visible quick edit dock at bottom.
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
  const [showSpec, setShowSpec] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    title: string;
    alt: string;
  } | null>(null);
  const isDefault = character.defaultByStyle[version.styleId] === version.id;
  const busy = version.status === "queued" || version.status === "in_progress";
  const board = version.blueprintKind === "board";
  const cost = board ? BLUEPRINT_COST : FRAME_COST;
  const short = !subscribed || credits < cost;
  const blueprintAlt = t("characters.versionBlueprintAlt", {
    name: character.name,
    n: version.number,
  });
  const hasDetails = Boolean(
    version.spec || version.editInstruction || version.prompt || version.referenceImageUrl,
  );

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim()) return;
    onEdit(instruction.trim());
    setInstruction("");
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/90 p-4 shadow-[6px_6px_0_0_rgba(18,20,28,0.06)]">
      {previewImage ? (
        <CharacterImagePreviewDialog
          src={previewImage.src}
          title={previewImage.title}
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
        />
      ) : null}

      {/* Compact Top Bar: Version title + Default / Retry / Details buttons */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-bold">
            v{version.number}
            {isDefault ? (
              <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-xs font-bold">
                {t("characters.defaultBadge")}
              </span>
            ) : null}
          </h2>
          <span className="text-xs text-muted">
            {new Date(version.createdAt).toLocaleString(locale)}
          </span>
          {version.editInstruction ? (
            <span className="max-w-xs truncate rounded-full bg-accent-ink/8 px-2.5 py-0.5 text-xs text-muted">
              {version.editInstruction}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasDetails ? (
            <button
              type="button"
              onClick={() => setShowSpec((value) => !value)}
              aria-expanded={showSpec}
              className={`inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-xs font-semibold transition ${
                showSpec
                  ? "border-accent-ink bg-accent-ink text-paper"
                  : "border-accent-ink/15 bg-paper text-muted hover:text-foreground"
              }`}
            >
              {t("characters.specHeading")}
            </button>
          ) : null}
          {version.status === "completed" && !isDefault ? (
            <button
              type="button"
              onClick={onSetDefault}
              disabled={pending !== ""}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/15 bg-paper px-3 text-xs font-semibold transition hover:border-accent-ink/40 disabled:opacity-60"
            >
              {pending === "default" ? <Spinner className="h-3.5 w-3.5" /> : null}
              {t("characters.setDefault")}
            </button>
          ) : null}
          {version.status === "failed" ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={pending !== ""}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-3.5 text-xs font-semibold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {pending === "retry" ? <Spinner className="h-3.5 w-3.5" /> : null}
              {t("characters.retryCredits", { cost })}
            </button>
          ) : null}
        </div>
      </div>

      {/* Collapsible Spec / Prompt Drawer */}
      {showSpec && hasDetails ? (
        <dl className="mt-2.5 max-h-32 shrink-0 space-y-1.5 overflow-y-auto rounded-xl border border-accent-ink/10 bg-paper p-3 text-xs">
          {version.spec ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.1em] text-muted">
                {t("characters.specHeading")}
              </dt>
              <dd className="mt-1">
                <CharacterSpecList spec={version.spec} />
              </dd>
            </div>
          ) : null}
          {version.editInstruction ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.1em] text-muted">
                {t("characters.changeThisRun")}
              </dt>
              <dd className="mt-0.5">{version.editInstruction}</dd>
            </div>
          ) : null}
          {version.prompt ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.1em] text-muted">
                {t("characters.characterDescription")}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-muted">{version.prompt}</dd>
            </div>
          ) : version.referenceImageUrl ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.1em] text-muted">
                {t("characters.characterSource")}
              </dt>
              <dd className="mt-0.5 text-muted">{t("characters.characterFromReferences")}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {/* Main Blueprint Preview Canvas (takes all available height) */}
      <div className="relative mt-3 min-h-[16rem] flex-1 overflow-hidden rounded-xl border border-accent-ink/10 bg-white">
        {board ? (
          <BlueprintBoard
            name={character.name}
            version={version}
            onPreviewImage={setPreviewImage}
          />
        ) : version.blueprintUrl ? (
          <button
            type="button"
            onClick={() =>
              setPreviewImage({
                src: version.blueprintUrl!,
                title: `${character.name} · v${version.number}`,
                alt: blueprintAlt,
              })
            }
            aria-label={blueprintAlt}
            className="group absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={version.blueprintUrl}
              alt={blueprintAlt}
              className="h-full w-full object-contain transition duration-150 group-hover:scale-[1.015]"
            />
          </button>
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

      {error ? (
        <p role="alert" className="mt-2.5 shrink-0 text-xs font-medium text-accent">
          {translateAppError(error, t)}
        </p>
      ) : null}

      {/* Always-Visible Quick Edit Dock (no need to toggle a button or scroll!) */}
      {version.status === "completed" ? (
        <form onSubmit={submitEdit} className="mt-3 shrink-0 border-t border-accent-ink/10 pt-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              {t("characters.editWhatLabel")}
              {hasOriginalPhoto(character, version) ? (
                <span className="ml-2 font-normal text-muted">
                  ({t("characters.editKeepsOriginal")})
                </span>
              ) : null}
            </span>
            <span className="text-[11px] text-muted">
              {short
                ? subscribed
                  ? t("characters.creditsShortSubscribed", { remaining: credits })
                  : t("characters.creditsNeedSubscribe")
                : t("characters.creditsRemaining", { remaining: credits })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              disabled={pending !== ""}
              placeholder={t("characters.editWhatPlaceholder")}
              aria-label={t("characters.editWhatLabel")}
              className="h-10 min-w-0 flex-1 rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!instruction.trim() || pending !== ""}
              className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-accent px-4 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "edit" ? <Spinner className="h-3.5 w-3.5" /> : null}
              {t("characters.generateNewVersion", { cost })}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
