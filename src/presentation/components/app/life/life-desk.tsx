"use client";

import { useMemo, useState } from "react";
import { LIFE_SHOT_KINDS, type LifeShotKind } from "@/model/life-shot-kind";
import { generateLifeShotAction, searchLifeScenesAction } from "@/presentation/actions/life";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { LifeCharacterStrip } from "@/presentation/components/app/life/life-character-strip";
import { LifeSceneSource } from "@/presentation/components/app/life/life-scene-source";
import { LifeShotGrid } from "@/presentation/components/app/life/life-shot-grid";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { FRAME_COST } from "@/service/credit-costs";
import type { PublicLifeCharacter, PublicLifeShot } from "@/service/character/life";
import type { LifeSceneHit } from "@/service/character/life-prompt";
import { translateAppError } from "@/util/i18n/translate-app-error";

const KIND_KEY = {
  selfie: "life.selfie",
  food: "life.food",
  street: "life.street",
  hobby: "life.hobby",
} as const;

// Pick a character, a place, and a real photo, then generate one life still.
export function LifeDesk({
  characters,
  shots: initialShots,
  initialCharacterId,
  subscribed,
}: {
  characters: PublicLifeCharacter[];
  shots: PublicLifeShot[];
  initialCharacterId?: string;
  subscribed: boolean;
}) {
  const { t } = useI18n();
  const first = characters.find((item) => item.id === initialCharacterId) || characters[0];
  const [characterId, setCharacterId] = useState(first?.id || "");
  const [place, setPlace] = useState(first?.persona?.city || "");
  const [kind, setKind] = useState<LifeShotKind>("selfie");
  const [mode, setMode] = useState<"search" | "upload">("search");
  const [hits, setHits] = useState<LifeSceneHit[]>([]);
  const [uploadUrl, setUploadUrl] = useState("");
  const [sceneUrl, setSceneUrl] = useState("");
  const [shots, setShots] = useState(initialShots);
  const [pending, setPending] = useState<"search" | "upload" | "generate" | "">("");
  const [error, setError] = useState("");
  const [creditGate, setCreditGate] = useState(false);

  const character = useMemo(
    () => characters.find((item) => item.id === characterId) || null,
    [characters, characterId],
  );

  function selectCharacter(id: string) {
    const next = characters.find((item) => item.id === id);
    setCharacterId(id);
    if (next?.persona?.city) setPlace(next.persona.city);
    setHits([]);
    setSceneUrl("");
    setUploadUrl("");
    setError("");
  }

  async function onSearch() {
    if (!place.trim()) {
      setError(t("life.placePlaceholder"));
      return;
    }
    setPending("search");
    setError("");
    try {
      const result = await searchLifeScenesAction({
        place,
        kind,
        interest: character?.persona?.interests[0],
      });
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      setHits(result.hits);
      setSceneUrl(result.hits[0]?.thumbUrl || "");
      setMode("search");
    } catch {
      setPending("");
      setError(t("errors.lifeSearchFailed"));
    }
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setPending("upload");
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      const uploaded = await uploadCharacterImageAction(data);
      setPending("");
      if (!uploaded.ok || !uploaded.url) {
        setError(translateAppError(uploaded.ok ? "" : uploaded.error, t));
        return;
      }
      setUploadUrl(uploaded.url);
      setSceneUrl(uploaded.url);
      setMode("upload");
    } catch {
      setPending("");
      setError(t("errors.genericRetry"));
    }
  }

  async function onGenerate() {
    if (!character?.ready) {
      setError(t("life.needBlueprint"));
      return;
    }
    if (!sceneUrl) {
      setError(t("life.needScene"));
      return;
    }
    setPending("generate");
    setError("");
    try {
      const result = await generateLifeShotAction({
        characterId: character.id,
        place,
        kind,
        sceneImageUrl: sceneUrl,
        source: mode,
      });
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) setCreditGate(true);
        return;
      }
      setShots((current) => [result.shot, ...current]);
    } catch {
      setPending("");
      setError(t("errors.lifeGenerateFailed"));
    }
  }

  if (!characters.length) {
    return (
      <div>
        <header>
          <h1 className="font-display text-3xl font-bold">{t("life.title")}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">{t("life.subtitle")}</p>
        </header>
        <p className="mt-6 text-sm text-muted">{t("life.emptyCharacters")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold">{t("life.title")}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">{t("life.subtitle")}</p>
      </header>
      <section className="rounded-2xl border border-accent-ink/10 bg-paper/90 p-4">
        <p className="mb-2 text-xs font-semibold text-muted">{t("life.character")}</p>
        <LifeCharacterStrip characters={characters} selectedId={characterId} onSelect={selectCharacter} />
        {character && !character.ready ? (
          <p className="mt-2 text-xs font-semibold text-red-600">{t("life.needBlueprint")}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-semibold text-muted">
            {t("life.place")}
            <input
              value={place}
              maxLength={40}
              placeholder={t("life.placePlaceholder")}
              onChange={(event) => setPlace(event.target.value)}
              className="h-9 rounded-full border border-accent-ink/15 bg-paper px-3 text-sm font-medium text-foreground"
            />
          </label>
          <div className="inline-flex rounded-full border border-accent-ink/10 bg-paper p-0.5" role="radiogroup" aria-label={t("life.kindLabel")}>
            {LIFE_SHOT_KINDS.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={kind === item}
                onClick={() => {
                  setKind(item);
                  setHits([]);
                  setSceneUrl(mode === "upload" ? uploadUrl : "");
                }}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${
                  kind === item ? "bg-accent-ink text-paper" : "text-muted"
                }`}
              >
                {t(KIND_KEY[item])}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending !== ""}
            onClick={() => void onSearch()}
            className="inline-flex h-9 cursor-pointer items-center rounded-full border border-accent-ink/20 px-3 text-xs font-bold disabled:opacity-60"
          >
            {pending === "search" ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
            {pending === "search" ? t("life.searching") : t("life.searchAction")}
          </button>
          <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-accent-ink/20 px-3 text-xs font-bold">
            {pending === "upload" ? t("common.loading") : t("life.upload")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={pending !== ""}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void onUpload(file);
              }}
            />
          </label>
          <button
            type="button"
            disabled={pending !== "" || !character?.ready}
            onClick={() => void onGenerate()}
            className="inline-flex h-9 cursor-pointer items-center rounded-full bg-accent px-4 text-xs font-bold text-white disabled:opacity-60"
          >
            {pending === "generate" ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
            {pending === "generate" ? t("life.generating") : t("life.generate")}
            <span className="ml-2 font-medium opacity-80">{t("life.cost", { cost: FRAME_COST })}</span>
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">{t("life.uploadHint")}</p>
        {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}
        <div className="mt-3">
          <LifeSceneSource
            mode={mode}
            hits={hits}
            selectedUrl={sceneUrl}
            uploadUrl={uploadUrl}
            onPick={setSceneUrl}
          />
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">{t("life.recent")}</h2>
        <LifeShotGrid shots={shots} />
      </section>
      {creditGate ? (
        <InsufficientCreditsDialog
          needed={FRAME_COST}
          subscribed={subscribed}
          onClose={() => setCreditGate(false)}
          onPaid={() => setCreditGate(false)}
        />
      ) : null}
    </div>
  );
}
