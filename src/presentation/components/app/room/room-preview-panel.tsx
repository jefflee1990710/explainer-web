"use client";

import { useState } from "react";
import { BlueprintBoard } from "@/presentation/components/app/characters/[id]/blueprint-board";
import { CharacterImagePreviewDialog } from "@/presentation/components/app/characters/[id]/character-image-preview-dialog";
import { CharacterSpecList } from "@/presentation/components/app/characters/[id]/character-spec-list";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter, PublicCharacterVersion } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Center column: identity portrait and full body for the selected look, with appearance notes and retry.
export function RoomPreviewPanel({
  character,
  version,
  cost,
  pending,
  error,
  onRetry,
}: {
  character: PublicCharacter;
  version: PublicCharacterVersion;
  cost: number;
  pending: string;
  error: string;
  onRetry: () => void;
}) {
  const { t, locale } = useI18n();
  const [showSpec, setShowSpec] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string; alt: string } | null>(null);
  const busy = version.status === "queued" || version.status === "in_progress";
  const board = version.blueprintKind === "board";
  const blueprintAlt = t("characters.versionBlueprintAlt", { name: character.name, n: version.number });
  const hasDetails = Boolean(version.spec || version.editInstruction || version.prompt || version.referenceImageUrl);

  return (
    <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/90 p-3 lg:min-h-0">
      {previewImage ? (
        <CharacterImagePreviewDialog
          src={previewImage.src}
          title={previewImage.title}
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
        />
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{new Date(version.createdAt).toLocaleString(locale)}</span>
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

      {showSpec && hasDetails ? (
        <dl className="mt-2.5 max-h-36 shrink-0 space-y-1.5 overflow-y-auto rounded-xl border border-accent-ink/10 bg-paper p-3 text-xs">
          {version.spec ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.1em] text-muted">{t("characters.specHeading")}</dt>
              <dd className="mt-1">
                <CharacterSpecList spec={version.spec} />
              </dd>
            </div>
          ) : null}
          {version.editInstruction ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.1em] text-muted">{t("characters.changeThisRun")}</dt>
              <dd className="mt-0.5">{version.editInstruction}</dd>
            </div>
          ) : null}
          {version.prompt ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.1em] text-muted">{t("characters.characterDescription")}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-muted">{version.prompt}</dd>
            </div>
          ) : version.referenceImageUrl ? (
            <div>
              <dt className="font-semibold uppercase tracking-[0.1em] text-muted">{t("characters.characterSource")}</dt>
              <dd className="mt-0.5 text-muted">{t("characters.characterFromReferences")}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="relative mt-3 min-h-[20rem] flex-1 overflow-hidden rounded-xl border border-accent-ink/10 bg-white">
        {board ? (
          <BlueprintBoard name={character.name} version={version} onPreviewImage={setPreviewImage} />
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
          <div className="absolute inset-0 grid place-items-center bg-accent-ink/5 text-sm text-muted">
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
          {error}
        </p>
      ) : null}
    </section>
  );
}
