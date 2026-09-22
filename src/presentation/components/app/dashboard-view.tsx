"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicFolder } from "@/presentation/serialize";
import { CreateFolderButton } from "@/presentation/components/app/create-folder-modal";
import { ProjectGrid } from "@/presentation/components/app/project-grid";

// Client shell for the dashboard so copy follows the UI locale.
export function DashboardView({
  folders,
  credits,
  subscribed,
}: {
  folders: PublicFolder[];
  credits: number;
  subscribed: boolean;
}) {
  const { t } = useI18n();

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("dashboard.title")}</h1>
          <p className="mt-2 text-sm text-muted">
            {subscribed
              ? t("dashboard.subscribed", { credits })
              : t("dashboard.notSubscribed")}
          </p>
        </div>
        <CreateFolderButton>{t("folder.create")}</CreateFolderButton>
      </div>

      {!subscribed ? (
        <div className="mt-6 rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 p-5 text-sm shadow-[4px_4px_0_0_rgba(255,77,46,0.2)]">
          {t("dashboard.noSubscriptionBanner")}
          <Link href="/app/billing" className="ml-2 font-semibold underline">
            {t("dashboard.goBilling")}
          </Link>
        </div>
      ) : null}

      <div className="mt-8">
        <ProjectGrid folders={folders} />
      </div>
    </div>
  );
}
