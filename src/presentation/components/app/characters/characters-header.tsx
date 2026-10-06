"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import { CreateCharacterButton } from "@/presentation/components/app/characters/create-character-modal";

export function CharactersHeader({
  credits,
  subscribed,
  styles,
  characterCount,
  characterLimit,
}: {
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
  characterCount: number;
  // null means this account has no character cap.
  characterLimit: number | null;
}) {
  const { t } = useI18n();
  const atLimit = characterLimit != null && characterCount >= characterLimit;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl font-bold">{t("characters.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("characters.subtitle")}</p>
        {characterLimit != null ? (
          <p className="mt-1 text-xs text-muted">
            {atLimit
              ? characterLimit <= 1
                ? t("characters.characterNeedSubscribe")
                : t("characters.characterAtLimit", { limit: characterLimit })
              : t("characters.characterUsage", {
                  used: characterCount,
                  limit: characterLimit,
                })}
          </p>
        ) : null}
      </div>
      <CreateCharacterButton
        credits={credits}
        subscribed={subscribed}
        styles={styles}
        atCharacterLimit={atLimit}
      />
    </div>
  );
}
