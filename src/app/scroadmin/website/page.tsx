import { AnalyticsSectionNav } from "@/app/scroadmin/analytics/analytics-section-nav";
import { WebsiteAnalyticsDashboard } from "@/app/scroadmin/website/website-analytics-dashboard";
import { getWebsiteAnalyticsReport } from "@/service/analytics/website-analytics";

export const dynamic = "force-dynamic";

// Admin Website Entry & Registration/Login Funnel page (`/scroadmin/website`).
export default async function ScroAdminWebsiteAnalyticsPage() {
  const report = await getWebsiteAnalyticsReport();

  return (
    <main className="space-y-6">
      <AnalyticsSectionNav />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Website Traffic & Registration / Login Funnel
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#12141c]">
          官網進站與註冊 / 登入轉換分析
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          獨立分析訪客從首頁、功能著陸頁與部落格進站後，點擊進入註冊 (`/sign-up`) 或登入 (`/sign-in`) 的轉換漏斗，並無縫銜接至登入後的 `/scroadmin/analytics` 工作台行為分析。
        </p>
      </div>
      <WebsiteAnalyticsDashboard report={report} />
    </main>
  );
}
