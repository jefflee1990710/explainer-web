"use server";

import { requireClerkUserId } from "@/service/auth";
import { searchFreesoundSounds } from "@/service/freesound/search";
import {
  createAndPersistElevenLabsSound,
  searchSavedElevenLabsSounds,
  SOUND_EFFECT_CATEGORIES,
  type SoundEffectCategoryId,
  type SoundEffectSourceFilter,
} from "@/service/sound-effect/elevenlabs-sfx";

function rethrowRedirect(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
}

// Combined ElevenLabs AI + Freesound sound effects with category & source filtering.
export async function listSoundEffectsAction(input: {
  page?: number;
  query?: string;
  category?: SoundEffectCategoryId;
  source?: SoundEffectSourceFilter;
  commercialOnly?: boolean;
}) {
  try {
    await requireClerkUserId();
    const pageNum = input.page ?? 1;
    const categoryObj = SOUND_EFFECT_CATEGORIES.find((c) => c.id === input.category);
    const categoryQuery =
      categoryObj && categoryObj.id !== "all" ? categoryObj.query : "";
    const combinedQuery = [input.query?.trim() || "", categoryQuery]
      .filter(Boolean)
      .join(" ")
      .trim();

    const source = input.source ?? "all";
    const elevenLabsList =
      pageNum === 1 && (source === "all" || source === "elevenlabs")
        ? await searchSavedElevenLabsSounds({
            query: input.query,
            category: input.category,
          }).catch(() => [])
        : [];

    if (source === "elevenlabs") {
      return {
        ok: true as const,
        count: elevenLabsList.length,
        hasNext: false,
        results: elevenLabsList,
      };
    }

    const freesoundPage = await searchFreesoundSounds({
      page: pageNum,
      query: combinedQuery,
      commercialOnly: input.commercialOnly,
    }).catch(() => ({ count: 0, hasNext: false, results: [] }));

    const merged = [...elevenLabsList, ...freesoundPage.results];
    return {
      ok: true as const,
      count: elevenLabsList.length + freesoundPage.count,
      hasNext: freesoundPage.hasNext,
      results: merged,
    };
  } catch (error) {
    rethrowRedirect(error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "無法讀取音效",
    };
  }
}

// Freesound background music (BGM) search filtered to longer instrumental beds.
export async function listBgmTracksAction(input: {
  page?: number;
  query?: string;
  moodQuery?: string;
  commercialOnly?: boolean;
}) {
  try {
    await requireClerkUserId();
    const pageNum = input.page ?? 1;
    const rawQuery = input.query?.trim() || "";
    const moodQuery = input.moodQuery?.trim() || "ambient instrumental background music";
    const combinedQuery = rawQuery
      ? `${rawQuery} instrumental music`
      : moodQuery;

    const freesoundPage = await searchFreesoundSounds({
      page: pageNum,
      query: combinedQuery,
      commercialOnly: input.commercialOnly ?? true,
      durationMinSec: 15,
      durationMaxSec: 300,
    }).catch(() => ({ count: 0, hasNext: false, results: [] }));

    return {
      ok: true as const,
      count: freesoundPage.count,
      hasNext: freesoundPage.hasNext,
      results: freesoundPage.results,
    };
  } catch (error) {
    rethrowRedirect(error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "無法讀取背景音樂",
    };
  }
}

export async function generateElevenLabsSoundEffectAction(input: {
  text: string;
  category?: SoundEffectCategoryId;
  durationSeconds?: number;
}) {
  try {
    await requireClerkUserId();
    const sound = await createAndPersistElevenLabsSound(input);
    return { ok: true as const, sound };
  } catch (error) {
    rethrowRedirect(error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "ElevenLabs 音效產生失敗",
    };
  }
}
