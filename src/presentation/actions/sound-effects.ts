"use server";

import { requireClerkUserId } from "@/service/auth";
import { searchFreesoundSounds } from "@/service/freesound/search";

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

// One page of Freesound results for the editor panel.
export async function listSoundEffectsAction(input: {
  page?: number;
  query?: string;
  commercialOnly?: boolean;
}) {
  try {
    await requireClerkUserId();
    const page = await searchFreesoundSounds(input);
    return { ok: true as const, ...page };
  } catch (error) {
    rethrowRedirect(error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "無法讀取音效",
    };
  }
}
