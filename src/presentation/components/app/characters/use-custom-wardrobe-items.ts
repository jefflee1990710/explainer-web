"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicCustomWardrobeItem } from "@/model/custom-wardrobe-item";
import { listCustomWardrobeItemsAction } from "@/presentation/actions/custom-wardrobe";
import type { AnyCharacterLookPart } from "@/service/character/character-look";

let cachedItems: PublicCustomWardrobeItem[] | null = null;
const listeners = new Set<(items: PublicCustomWardrobeItem[]) => void>();

export function notifyCustomWardrobeChanged(next: PublicCustomWardrobeItem[]) {
  cachedItems = next;
  for (const listener of listeners) listener(next);
}

/** Client hook that loads and subscribes to the signed-in user's custom wardrobe items. */
export function useCustomWardrobeItems(part?: AnyCharacterLookPart) {
  const [items, setItems] = useState<PublicCustomWardrobeItem[]>(cachedItems ?? []);

  const refresh = useCallback(async () => {
    const res = await listCustomWardrobeItemsAction();
    if (res.ok) {
      notifyCustomWardrobeChanged(res.items);
    }
  }, []);

  useEffect(() => {
    const listener = (next: PublicCustomWardrobeItem[]) => setItems(next);
    listeners.add(listener);
    if (cachedItems === null) {
      void refresh();
    }
    return () => {
      listeners.delete(listener);
    };
  }, [refresh]);

  const partItems = part
    ? items.filter((item) => item.part === part)
    : items;

  const byOptionId = new Map(items.map((item) => [item.optionId, item]));
  const promptMap = new Map(items.map((item) => [item.optionId, item.prompt]));

  return {
    items,
    partItems,
    byOptionId,
    promptMap,
    refresh,
  };
}
