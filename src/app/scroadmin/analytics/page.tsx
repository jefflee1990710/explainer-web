import { AnalyticsSectionNav } from "@/app/scroadmin/analytics/analytics-section-nav";
import { UxAnalyticsDashboard } from "@/app/scroadmin/analytics/ux-analytics-dashboard";
import { getUxDiagnosticsReport } from "@/service/analytics/ux-diagnostics";

export const dynamic = "force-dynamic";

// Admin UX Funnel & User Drop-off Diagnostics page (`/scroadmin/analytics`).
export default async function ScroAdminAnalyticsPage() {
  const report = await getUxDiagnosticsReport();

  return (
    <main className="space-y-6">
      <AnalyticsSectionNav />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Post-Login Studio Funnel & Drop-off Diagnostics
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#12141c]">
          登入後工作台路徑與流失診斷
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          承接 `/scroadmin/website` 的註冊/登入轉換，結合 MongoDB 即時事件流 (`ux_events`) 與全量用戶創作狀態，追蹤登入後的同意條款、建立角色、分鏡與成片產出率。
        </p>
      </div>
      <UxAnalyticsDashboard report={report} />
    </main>
  );
}
