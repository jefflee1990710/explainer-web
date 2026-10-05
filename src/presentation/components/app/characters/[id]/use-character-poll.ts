"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshCharacterAction } from "@/presentation/actions/characters";
import type { PublicCharacter } from "@/presentation/serialize";

// Poll while a blueprint or its portrait is still generating.
export function useCharacterPoll(
  character: PublicCharacter,
  onUpdate: (next: PublicCharacter) => void,
  onError?: (message: string) => void,
) {
  const router = useRouter();
  const { id, pending, profilePending } = character;
  const waiting = pending || profilePending;

  useEffect(() => {
    if (!waiting) return;
    let cancelled = false;

    async function tick() {
      const result = await refreshCharacterAction(id);
      if (cancelled) return;
      if (result.ok) {
        onUpdate(result.character);
        if (!result.character.pending && !result.character.profilePending) router.refresh();
      } else {
        onError?.(result.error);
      }
    }

    void tick();
    const timer = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, waiting, onUpdate, onError, router]);
}
