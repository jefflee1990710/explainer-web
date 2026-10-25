import { UxAnalyticsDashboard } from "@/app/scroadmin/analytics/ux-analytics-dashboard";
import { getUxDiagnosticsReport } from "@/service/analytics/ux-diagnostics";

export const dynamic = "force-dynamic";

// Admin UX Funnel & User Drop-off Diagnostics page (`/scroadmin/analytics`).
export default async function ScroAdminAnalyticsPage() {
  const report = await getUxDiagnosticsReport();

  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          UX Analytics & Funnel Diagnostics
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#12141c]">
          用戶路徑追蹤與流失診斷
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          結合 Google Analytics (GA4)、MongoDB 即時事件流 (`ux_events`) 與資料庫全量用戶狀態，自動定位每位用戶在哪一個步驟停下來。
        </p>
      </div>
      <UxAnalyticsDashboard report={report} />
    </main>
  );
}
