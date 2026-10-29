"use client";

import { CreateDirectorButton } from "@/presentation/components/app/directors/create-director-modal";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicSkill } from "@/presentation/serialize";

// Page title, short explainer, and primary "+ Create Custom Director" trigger for the Director library.
export function DirectorsHeader({ systemDirectors = [] }: { systemDirectors?: PublicSkill[] }) {
  const { t, locale } = useI18n();
  const isZh = locale.startsWith("zh");

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl font-bold">{t("directors.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("directors.subtitle")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CreateDirectorButton templates={systemDirectors} defaultTab="video">
          {isZh ? "＋ AI 參考影片／建立導演" : "+ Create Custom Director"}
        </CreateDirectorButton>
      </div>
    </div>
  );
}
