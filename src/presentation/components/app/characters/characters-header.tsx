"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import { CreateCharacterButton } from "@/presentation/components/app/characters/create-character-modal";

export function CharactersHeader({
  credits,
  subscribed,
  styles,
}: {
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
}) {
  const { t } = useI18n();

  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("characters.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("characters.subtitle")}</p>
      </div>
      <CreateCharacterButton credits={credits} subscribed={subscribed} styles={styles} />
    </div>
  );
}
