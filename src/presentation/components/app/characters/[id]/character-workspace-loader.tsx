"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { loadCharacterWorkspaceAction } from "@/presentation/actions/characters";
import { CharacterPageSkeleton } from "@/presentation/components/app/characters/[id]/character-page-skeleton";
import { CharacterWorkspace } from "@/presentation/components/app/characters/[id]/character-workspace";
import { useI18n } from "@/presentation/components/i18n-provider";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { CharacterWorkspaceLoad } from "@/service/character/actions";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: Extract<CharacterWorkspaceLoad, { ok: true }> }
  | { status: "missing" }
  | { status: "error"; message: string };

// The route renders this immediately. Character, credits, and styles arrive after.
export function CharacterWorkspaceLoader({ id }: { id: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void loadCharacterWorkspaceAction(id).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState(result.error === "角色不存在" ? { status: "missing" } : { status: "error", message: result.error });
        return;
      }
      setState({ status: "ready", data: result });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "missing") notFound();
  if (state.status === "loading") return <CharacterPageSkeleton />;
  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-accent">
        {translateAppError(state.message, t)}
      </p>
    );
  }

  const data = state.data;
  return (
    <CharacterWorkspace
      character={data.character}
      credits={data.credits}
      subscribed={data.subscribed}
      planId={data.planId}
      unlimitedStyles={data.unlimitedStyles}
      styles={data.styles}
    />
  );
}
