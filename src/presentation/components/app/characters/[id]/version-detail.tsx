"use client";

import { useId, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import { BlueprintBoard } from "@/presentation/components/app/characters/[id]/blueprint-board";
import { CharacterImagePreviewDialog } from "@/presentation/components/app/characters/[id]/character-image-preview-dialog";
import { CharacterPresetsBar } from "@/presentation/components/app/characters/[id]/character-presets-bar";
import { CharacterSpecList } from "@/presentation/components/app/characters/[id]/character-spec-list";
import { CharacterLookArt } from "@/presentation/components/app/characters/character-look-art";
import { CharacterLookDialog } from "@/presentation/components/app/characters/character-look-dialog";
import {
  applyWardrobePick,
  CHARACTER_WARDROBE_PARTS,
  characterWardrobeEditInstruction,
  defaultCharacterLook,
  detectCharacterWardrobePicks,
  isExaggeratedLookOption,
  type CharacterWardrobePart,
  type CharacterWardrobePicks,
} from "@/service/character/character-look";
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
  styleVersions,
  credits,
  subscribed,
  pending,
  error,
  onSelectVersion,
  onSavePreset,
  onDeletePreset,
  onEdit,
  onRetry,
}: {
  character: PublicCharacter;
  version: PublicCharacterVersion;
  styleVersions: PublicCharacterVersion[];
  credits: number;
  subscribed: boolean;
  pending: string;
  error: string;
  onSelectVersion: (versionId: string) => void;
  onSavePreset: (versionId: string, name: string) => Promise<boolean>;
  onDeletePreset: (presetId: string) => void;
  onEdit: (instruction: string) => void;
  onRetry: () => void;
}) {
  const { t, locale } = useI18n();
  const editFormId = useId();
  const [showSpec, setShowSpec] = useState(false);
  const [instruction, setInstruction] = useState("");
  const currentWardrobe = detectCharacterWardrobePicks(
    [version.prompt, version.editInstruction].filter(Boolean).join("\n"),
  );
  const [wardrobePicks, setWardrobePicks] = useState<CharacterWardrobePicks>({});
  const [dialogPart, setDialogPart] = useState<CharacterWardrobePart | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    title: string;
    alt: string;
  } | null>(null);
  const busy = version.status === "queued" || version.status === "in_progress";
  const board = version.blueprintKind === "board";
  const cost = board ? BLUEPRINT_COST : FRAME_COST;
  const short = credits < cost;
  const blueprintAlt = t("characters.versionBlueprintAlt", {
    name: character.name,
    n: version.number,
  });
  const hasDetails = Boolean(
    version.spec || version.editInstruction || version.prompt || version.referenceImageUrl,
  );
  const composedEdit = characterWardrobeEditInstruction(wardrobePicks, instruction, currentWardrobe.top);

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!composedEdit || pending !== "") return;
    onEdit(composedEdit);
    setInstruction("");
    setWardrobePicks({});
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

      {/* Compact Top Bar: Timestamp + Retry / Details buttons */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Presets & Versions Bar */}
      <CharacterPresetsBar
        character={character}
        activeVersion={version}
        styleVersions={styleVersions}
        pending={pending}
        onSelectVersion={onSelectVersion}
        onSavePreset={onSavePreset}
        onDeletePreset={onDeletePreset}
      />

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

      {dialogPart ? (
        <CharacterLookDialog
          part={dialogPart}
          value={
            wardrobePicks[dialogPart] ??
            currentWardrobe[dialogPart] ??
            defaultCharacterLook()[dialogPart] ??
            ""
          }
          onChange={(id) =>
            setWardrobePicks((current) => applyWardrobePick(current, dialogPart, id, currentWardrobe))
          }
          onClose={() => setDialogPart(null)}
        />
      ) : null}

      {/* Always-Visible Quick Edit Dock: Hair / Top / Pants / Shoes / Accessory + Text Input */}
      {version.status === "completed" ? (
        <form
          id={editFormId}
          onSubmit={submitEdit}
          className="mt-3 shrink-0 border-t border-accent-ink/10 pt-3"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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

          <div className="mb-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CHARACTER_WARDROBE_PARTS.map((part) => {
              const pickedId = wardrobePicks[part];
              const activeId = pickedId ?? currentWardrobe[part];
              const thumbId = activeId ?? defaultCharacterLook()[part] ?? "";
              const partLabel = t(`characters.look.${part}`);
              const optionName = activeId
                ? t(`characters.look.options.${part}.${activeId}`)
                : "—";
              const extreme = activeId ? isExaggeratedLookOption(part, activeId) : false;
              return (
                <div key={part} className="relative flex items-center">
                  <button
                    type="button"
                    disabled={pending !== ""}
                    onClick={() => setDialogPart(part)}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition ${
                      pickedId
                        ? "border-accent bg-accent/8 shadow-[2px_2px_0_0_#12141c]"
                        : "border-accent-ink/10 bg-paper hover:border-accent-ink/30"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span
                      className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-200 ${
                        activeId ? "" : "opacity-65"
                      }`}
                    >
                      <CharacterLookArt part={part} id={thumbId} />
                      {extreme ? (
                        <span className="absolute top-0.5 left-0.5 rounded bg-accent-ink px-1 py-0.2 text-[8px] font-extrabold text-paper">
                          !
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 pr-4">
                      <span className="block text-[10px] font-semibold text-muted">{partLabel}</span>
                      <span className="block truncate text-xs font-bold">{optionName}</span>
                    </span>
                  </button>
                  {pickedId ? (
                    <button
                      type="button"
                      disabled={pending !== ""}
                      onClick={() =>
                        setWardrobePicks((current) => {
                          const next = { ...current };
                          delete next[part];
                          return next;
                        })
                      }
                      aria-label={`${partLabel} reset`}
                      className="absolute right-1.5 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-accent-ink/10 text-[11px] font-bold text-muted transition hover:bg-accent-ink hover:text-paper"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })}
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
              form={editFormId}
              disabled={!composedEdit || pending !== ""}
              onClick={(event) => event.stopPropagation()}
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
