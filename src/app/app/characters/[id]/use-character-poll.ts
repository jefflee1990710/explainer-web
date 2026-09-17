"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshCharacterAction } from "@/lib/actions/characters";
import type { PublicCharacter } from "@/lib/serialize";

// Poll while any version is generating; stops once everything settles.
export function useCharacterPoll(
  character: PublicCharacter,
  onUpdate: (next: PublicCharacter) => void,
  onError?: (message: string) => void,
) {
  const router = useRouter();
  const { id, pending } = character;

  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void (async () => {
        const result = await refreshCharacterAction(id);
        if (cancelled) return;
        if (result.ok) {
          onUpdate(result.character);
          if (!result.character.pending) router.refresh();
        } else {
          onError?.(result.error);
        }
      })();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, pending, onUpdate, onError, router]);
}
