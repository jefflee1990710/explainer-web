"use client";

import { SignedInAccount } from "@/presentation/components/auth/signed-in-account";
import { GenerationDoneNotifier } from "@/presentation/components/app/tasks/generation-done-notifier";
import { queueBannerPending } from "@/presentation/components/app/tasks/queue-banner-copy";
import { readCachedTasks } from "@/presentation/components/app/tasks/task-cache";
import { TaskQueueBanner } from "@/presentation/components/app/tasks/task-queue-banner";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import { useI18n } from "@/presentation/components/i18n-provider";
import { StudioShell } from "@/presentation/studio/studio-shell";
import { SignupPromoBanner } from "@/presentation/components/signup-promo-banner";
import { WELCOME_CREDIT_USD } from "@/service/billing/welcome-credits";
// Logged-in chrome. Page content sits in the studio shell.
export function AppShell({
  creditUsd,
  creditLimitUsd,
  activeTasks,
  email,
  name,
  avatarUrl,
  affiliateEnabled = false,
  signupDiscountPercent = 0,
  promoBonusPercent = 0,
  children,
}: {
  creditUsd: number;
  creditLimitUsd: number;
  // Generation tasks still queued or running (top banner).
  activeTasks: number;
  email: string;
  name: string;
  avatarUrl?: string;
  // Rail item only. The page and actions check the same user flag.
  affiliateEnabled?: boolean;
  // Permanent rate locked at signup. Zero when this account has no promo.
  signupDiscountPercent?: number;
  promoBonusPercent?: number;
  children: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const { tasks, loaded } = useTaskPoll(readCachedTasks() ?? [], undefined, true);
  const runningCount = queueBannerPending(
    tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length,
    loaded,
    activeTasks,
  );

  return (
    <StudioShell
      taskBadge={runningCount}
      banner={
        signupDiscountPercent > 0 ? (
          <SignupPromoBanner
            variant="locked"
            discountPercent={signupDiscountPercent}
            creditUsd={WELCOME_CREDIT_USD}
            bonusPercent={promoBonusPercent}
          />
        ) : null
      }
      headerEnd={<TaskQueueBanner initialPending={activeTasks} />}
      toolbar={
        <SignedInAccount
          email={email}
          name={name}
          avatarUrl={avatarUrl}
          signOutLabel={t("auth.signOut")}
          settingsLabel={t("nav.settings")}
          usageLabel={locale === "en" ? "Usage & USD Credit" : "用量與儲值 Usage"}
          billingLabel={locale === "en" ? "Billing & Card" : "信用卡與付款 Billing"}
          invoicesLabel={locale === "en" ? "Invoices" : "帳單紀錄 Invoices"}
          mcpLabel={locale === "en" ? "API & MCP" : "API 與 MCP"}
          affiliateLabel={affiliateEnabled ? t("nav.affiliate") : undefined}
          creditUsd={creditUsd}
          creditLimitUsd={creditLimitUsd}
          creditsLabel="USD Credit"
        />
      }
    >
      {children}
      <GenerationDoneNotifier />
    </StudioShell>
  );
}
