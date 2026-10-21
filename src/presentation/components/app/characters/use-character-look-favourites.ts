"use client";

import { useCallback, useMemo, useState } from "react";
import type { AnyCharacterLookPart } from "@/service/character/character-look";

const STORAGE_KEY = "scro.character-look-favourites";

// Favourites are stored as "part:id" so the same id in another part stays separate.
function favouriteKey(part: AnyCharacterLookPart, id: string) {
  return `${part}:${id}`;
}

function readStoredFavourites(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function useCharacterLookFavourites(part: AnyCharacterLookPart) {
  const [stored, setStored] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readStoredFavourites(),
  );

  const ids = useMemo(
    () =>
      new Set(
        stored
          .filter((key) => key.startsWith(`${part}:`))
          .map((key) => key.slice(part.length + 1)),
      ),
    [part, stored],
  );

  const toggle = useCallback(
    (id: string) => {
      const key = favouriteKey(part, id);
      setStored((current) => {
        const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [part],
  );

  return { ids, toggle };
}
