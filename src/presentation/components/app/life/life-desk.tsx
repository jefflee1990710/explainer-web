"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LIFE_SHOT_KINDS, type LifeShotKind } from "@/model/life-shot-kind";
import {
  generateLifeShotAction,
  searchLifeScenesAction,
} from "@/presentation/actions/life";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { CharacterImagePreviewDialog } from "@/presentation/components/app/characters/[id]/character-image-preview-dialog";
import { LifeCharacterStrip } from "@/presentation/components/app/life/life-character-strip";
import { LifeSceneSource } from "@/presentation/components/app/life/life-scene-source";
import { LifeShotGrid } from "@/presentation/components/app/life/life-shot-grid";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { FRAME_COST } from "@/service/credit-costs";
import type {
  PublicLifeCharacter,
  PublicLifeShot,
} from "@/service/character/life";
import type { LifeSceneHit } from "@/service/character/life-prompt";
import { translateAppError } from "@/util/i18n/translate-app-error";

const KIND_KEY = {
  selfie: "life.selfie",
  food: "life.food",
  street: "life.street",
  hobby: "life.hobby",
} as const;

// Single-screen 3-column Studio for Life shots: Left character rail, Center place/photo picker, Right live preview & recent shots.
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
  const first =
    characters.find((item) => item.id === initialCharacterId) || characters[0];
  const [characterId, setCharacterId] = useState(first?.id || "");
  const [place, setPlace] = useState(first?.persona?.city || "");
  const [kind, setKind] = useState<LifeShotKind>("selfie");
  const [mode, setMode] = useState<"search" | "upload">("search");
  const [hits, setHits] = useState<LifeSceneHit[]>([]);
  const [uploadUrl, setUploadUrl] = useState("");
  const [sceneUrl, setSceneUrl] = useState("");
  const [shots, setShots] = useState(initialShots);
  const [activeShotId, setActiveShotId] = useState<string>(
    initialShots[0]?.id || "",
  );
  const [lightboxShot, setLightboxShot] = useState<PublicLifeShot | null>(null);
  const [pending, setPending] = useState<"search" | "upload" | "generate" | "">(
    "",
  );
  const [error, setError] = useState("");
  const [creditGate, setCreditGate] = useState(false);

  const character = useMemo(
    () => characters.find((item) => item.id === characterId) || null,
    [characters, characterId],
  );

  const activeShot = useMemo(
    () =>
      shots.find((item) => item.id === activeShotId) || shots[0] || null,
    [shots, activeShotId],
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
      setActiveShotId(result.shot.id);
    } catch {
      setPending("");
      setError(t("errors.lifeGenerateFailed"));
    }
  }

  if (!characters.length) {
    return (
      <div className="flex flex-col gap-3 lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-accent-ink/10 bg-paper/90 px-4 py-2.5">
          <div>
            <h1 className="font-display text-lg font-bold">{t("life.title")}</h1>
            <p className="text-xs text-muted">{t("life.subtitle")}</p>
          </div>
          <Link
            href="/app/characters"
            className="inline-flex h-8 items-center rounded-full bg-accent-ink px-3.5 text-xs font-bold text-lime"
          >
            {t("characters.create")}
          </Link>
        </header>
        <div className="grid flex-1 place-items-center rounded-2xl border border-accent-ink/10 bg-paper/80 p-6">
          <p className="text-sm text-muted">{t("life.emptyCharacters")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden">
      {lightboxShot ? (
        <CharacterImagePreviewDialog
          src={lightboxShot.resultUrl}
          title={`${lightboxShot.characterName} · ${t(KIND_KEY[lightboxShot.kind as LifeShotKind])} · ${lightboxShot.place}`}
          alt={lightboxShot.characterName}
          onClose={() => setLightboxShot(null)}
        />
      ) : null}

      {/* Compact Single-Row Studio Header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-accent-ink/10 bg-paper/90 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-display text-lg font-bold">{t("life.title")}</h1>
          <span className="hidden text-xs text-muted sm:inline">
            {t("life.subtitle")}
          </span>
        </div>

        {/* Kind Selector Tabs + Place Quick Input */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-full border border-accent-ink/10 bg-paper p-0.5"
            role="radiogroup"
            aria-label={t("life.kindLabel")}
          >
            {LIFE_SHOT_KINDS.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={kind === item}
                disabled={pending !== ""}
                onClick={() => {
                  setKind(item);
                  setHits([]);
                  setSceneUrl(mode === "upload" ? uploadUrl : "");
                }}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                  kind === item
                    ? "bg-accent-ink text-paper"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t(KIND_KEY[item])}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 3-Column Single-Screen Studio */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[14.5rem_minmax(0,1fr)_22rem] lg:items-stretch">
        {/* Left Column: Character Rail */}
        <aside
          aria-label={t("life.character")}
          className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/80 p-3"
        >
          <div className="flex shrink-0 items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
              {t("life.character")}
            </span>
            <span className="rounded-full bg-accent-ink/8 px-2 py-0.5 text-[10px] font-bold text-muted">
              {characters.length}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LifeCharacterStrip
              characters={characters}
              selectedId={characterId}
              onSelect={selectCharacter}
            />
          </div>
          {character && !character.ready ? (
            <p className="shrink-0 rounded-xl bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600">
              {t("life.needBlueprint")}
            </p>
          ) : null}
        </aside>

        {/* Center Column: Place Search, Upload & Scene Reference Grid */}
        <section
          aria-label={t("life.place")}
          className="flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/90"
        >
          {/* Top Search & Upload Bar inside Center Pane */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-accent-ink/10 px-4 py-3">
            <input
              type="text"
              value={place}
              maxLength={40}
              disabled={pending !== ""}
              placeholder={t("life.placePlaceholder")}
              aria-label={t("life.place")}
              onChange={(event) => setPlace(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onSearch();
                }
              }}
              className="h-9 min-w-[11rem] flex-1 rounded-full border border-accent-ink/15 bg-paper px-3.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
            <button
              type="button"
              disabled={pending !== ""}
              onClick={() => void onSearch()}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full border border-accent-ink/20 bg-paper px-3.5 text-xs font-bold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "search" ? (
                <Spinner className="mr-1.5 h-3.5 w-3.5" />
              ) : null}
              {pending === "search"
                ? t("life.searching")
                : t("life.searchAction")}
            </button>
            <label className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full border border-accent-ink/20 bg-paper px-3.5 text-xs font-bold text-foreground transition hover:border-accent-ink">
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
          </div>

          {/* Scrollable Scene Photo Candidates */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3.5">
            <LifeSceneSource
              mode={mode}
              hits={hits}
              selectedUrl={sceneUrl}
              uploadUrl={uploadUrl}
              onPick={setSceneUrl}
            />
          </div>

          {/* Bottom Action Dock inside Center Pane */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-accent-ink/10 bg-paper px-4 py-2.5">
            <p className="min-w-0 flex-1 truncate text-[11px] text-muted">
              {error ? (
                <span className="font-semibold text-red-600">{error}</span>
              ) : (
                t("life.uploadHint")
              )}
            </p>
            <button
              type="button"
              disabled={pending !== "" || !character?.ready}
              onClick={() => void onGenerate()}
              className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full bg-accent px-5 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "generate" ? (
                <Spinner className="mr-2 h-3.5 w-3.5" />
              ) : null}
              {pending === "generate"
                ? t("life.generating")
                : t("life.generate")}
              <span className="ml-2 font-medium opacity-85">
                · {t("life.cost", { cost: FRAME_COST })}
              </span>
            </button>
          </div>
        </section>

        {/* Right Column: Active Shot Preview + Scrollable Recent Strip */}
        <aside
          aria-label={t("life.recent")}
          className="flex min-h-[24rem] flex-col gap-2.5 overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper p-3.5"
        >
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="font-display text-sm font-bold">
              {t("life.recent")}
            </h2>
            {shots.length > 0 ? (
              <span className="rounded-full bg-accent-ink/8 px-2 py-0.5 text-[10px] font-bold text-muted">
                {shots.length}
              </span>
            ) : null}
          </div>

          {/* Featured Selected Shot Preview */}
          <div className="relative grid min-h-[12rem] flex-1 place-items-center overflow-hidden rounded-xl border border-accent-ink/10 bg-zinc-200/70">
            {activeShot ? (
              <button
                type="button"
                onClick={() => setLightboxShot(activeShot)}
                className="group relative h-full w-full cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeShot.resultUrl}
                  alt={activeShot.characterName}
                  className="h-full w-full object-contain transition duration-150 group-hover:scale-[1.015]"
                />
                <span className="absolute right-2 bottom-2 left-2 truncate rounded-lg bg-black/65 px-2.5 py-1 text-left text-[11px] font-medium text-white backdrop-blur-xs">
                  <strong className="font-bold">
                    {activeShot.characterName}
                  </strong>
                  {" · "}
                  {t(KIND_KEY[activeShot.kind as LifeShotKind])}
                  {activeShot.place ? ` · ${activeShot.place}` : ""}
                </span>
              </button>
            ) : (
              <p className="px-4 text-center text-xs text-muted">
                {t("life.emptyShots")}
              </p>
            )}
          </div>

          {/* Compact Scrollable Thumbnail Grid of Recent Shots */}
          {shots.length > 1 ? (
            <div className="max-h-44 shrink-0 overflow-y-auto pr-0.5">
              <LifeShotGrid
                shots={shots}
                selectedId={activeShot?.id}
                onSelect={(shot) => setActiveShotId(shot.id)}
                compact
              />
            </div>
          ) : null}
        </aside>
      </div>

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
