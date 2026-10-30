"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  VisitorJourneyRow,
  WebsiteAnalyticsReport,
} from "@/service/analytics/website-analytics";

function formatShortTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return "—";
  return date.toLocaleString("zh-HK", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function outcomeBadge(outcome: VisitorJourneyRow["authOutcome"]): {
  label: string;
  className: string;
} {
  switch (outcome) {
    case "signed_up":
      return {
        label: "完成註冊 (Signed Up)",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "logged_in":
      return {
        label: "完成登入 (Logged In)",
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    case "authenticated_session":
      return {
        label: "已登入工作階段 (Logged-In Session)",
        className: "border-indigo-200 bg-indigo-50 text-indigo-700",
      };
    case "auth_abandoned":
      return {
        label: "進入驗證頁未完成 (Abandoned Auth)",
        className: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "browsing":
      return {
        label: "僅瀏覽官網 (Browsing Only)",
        className: "border-zinc-200 bg-zinc-100 text-zinc-700",
      };
  }
}

// Interactive dashboard for `/scroadmin/website` — analyzes website entry, landing pages, sign-up/login conversion, and handoff into `/scroadmin/analytics`.
export function WebsiteAnalyticsDashboard({
  report,
}: {
  report: WebsiteAnalyticsReport;
}) {
  const [tab, setTab] = useState<"funnel" | "landings" | "visitors">("funnel");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");

  const filteredVisitors =
    outcomeFilter === "all"
      ? report.recentVisitors
      : report.recentVisitors.filter((v) => v.authOutcome === outcomeFilter);

  return (
    <div className="space-y-8">
      {/* Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            官網不重複訪客 (Website Visitors)
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-[#12141c]">
            {report.kpis.uniqueWebsiteVisitors}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            公開頁面總瀏覽：{report.kpis.totalPublicPageViews} 次 ·{" "}
            {report.kpis.totalSessions} 工作階段
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            進入註冊 / 登入頁比例 (Auth Intent)
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">
            {report.kpis.authIntentRatePercent}%
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            共 {report.kpis.visitorsReachedAuth} 位訪客點擊進入 `/sign-up` 或 `/sign-in`
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            註冊 / 登入轉換率 (Visitor → Account)
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">
            {report.kpis.visitorToAuthRatePercent}%
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            已轉換：{report.kpis.convertedToAccountVisitors} 人（近 7 日新註冊{" "}
            {report.kpis.newSignUps7d} 人 / 30 日 {report.kpis.newSignUps30d} 人）
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-[#12141c] p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#c6f24b]">
            進入登入後工作台 (Entered /app Flow)
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-white">
            {report.kpis.visitorsEnteredStudio}{" "}
            <span className="text-lg font-normal text-[#c6f24b]">
              ({report.kpis.studioEntryRatePercent}%)
            </span>
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-white/70">銜接登入後創作漏斗</span>
            <Link
              href="/scroadmin/analytics"
              className="inline-flex items-center rounded-full bg-[#c6f24b] px-3 py-1 text-xs font-bold text-[#12141c] transition hover:bg-[#d5f76e]"
            >
              查看登入後流向 (/analytics) →
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("funnel")}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "funnel"
              ? "bg-[#12141c] text-[#c6f24b]"
              : "bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          1. 官網進站 → 註冊/登入 → 工作台漏斗
        </button>
        <button
          type="button"
          onClick={() => setTab("landings")}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "landings"
              ? "bg-[#12141c] text-[#c6f24b]"
              : "bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          2. 各著陸頁表現與流量來源 ({report.landingPages.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("visitors")}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "visitors"
              ? "bg-[#12141c] text-[#c6f24b]"
              : "bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          3. 訪客進站與註冊路徑明細 ({report.recentVisitors.length})
        </button>
      </div>

      {tab === "funnel" ? (
        <div className="space-y-8">
          {/* 4-Stage Website Entry to Studio Funnel */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#12141c]">
                  官網進站至註冊 / 登入轉換漏斗 (Website Entry → Auth → Studio Funnel)
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  透過持久化匿名訪客 ID (`anonId`) 串聯未登入前的著陸頁瀏覽、進入 `/sign-up` 或 `/sign-in`、完成帳號驗證，以及進入 `/app` 登入後流程。
                </p>
              </div>
              <Link
                href="/scroadmin/analytics"
                className="inline-flex items-center rounded-full border border-[#12141c] bg-white px-4 py-2 text-xs font-semibold text-[#12141c] transition hover:bg-[#12141c] hover:text-[#c6f24b]"
              >
                前往 Step 4 之後的登入後行為分析 (/scroadmin/analytics) →
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {report.funnel.map((step, idx) => (
                <div
                  key={step.stepId}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-[#12141c]">
                        {step.label}
                      </span>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {step.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono font-bold text-[#12141c]">
                        {step.visitorCount} 人 ({step.conversionFromTopPercent}%)
                      </span>
                      {idx > 0 ? (
                        <span className="rounded-full bg-zinc-200/80 px-2.5 py-0.5 font-mono text-zinc-700">
                          上一步留存 {step.conversionFromPrevPercent}%
                        </span>
                      ) : null}
                      {idx > 0 && step.dropOffCount > 0 ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 font-semibold text-rose-700">
                          流失 -{step.dropOffCount} 人 (-{step.dropOffPercent}%)
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full rounded-full bg-[#12141c] transition-all"
                      style={{
                        width: `${Math.max(2, step.conversionFromTopPercent)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Auth Breakdown & Failures */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold text-[#12141c]">
                註冊 vs 登入方式拆解 (Sign-Up & Login Breakdown)
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                比較訪客造訪 `/sign-up` 與 `/sign-in` 的人數，以及使用 Google OAuth 或 Email 密碼完成驗證的比例。
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3.5">
                  <p className="text-xs text-zinc-500">造訪註冊頁 (/sign-up)</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[#12141c]">
                    {report.authBreakdown.signUpPageVisitors}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3.5">
                  <p className="text-xs text-zinc-500">造訪登入頁 (/sign-in)</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[#12141c]">
                    {report.authBreakdown.signInPageVisitors}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                  <p className="text-xs text-emerald-800">成功新註冊 (sign_up)</p>
                  <p className="mt-1 font-display text-2xl font-bold text-emerald-700">
                    {report.authBreakdown.signUpSuccessUsers}
                  </p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3.5">
                  <p className="text-xs text-sky-800">成功登入 (login)</p>
                  <p className="mt-1 font-display text-2xl font-bold text-sky-700">
                    {report.authBreakdown.loginSuccessUsers}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3.5">
                  <p className="text-xs text-zinc-500">Google 驗證次數</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[#12141c]">
                    {report.authBreakdown.googleAuthCount}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3.5">
                  <p className="text-xs text-zinc-500">Email 密碼驗證次數</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[#12141c]">
                    {report.authBreakdown.emailAuthCount}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#12141c]">
                    註冊 / 登入失敗阻斷紀錄 (Auth Errors)
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    追蹤在 `/sign-up` 或 `/sign-in` 發生密碼錯誤、信箱已存在或網域未授權等錯誤。
                  </p>
                </div>
                <span className="rounded-full bg-rose-50 px-3 py-1 font-mono text-xs font-bold text-rose-700">
                  共 {report.authBreakdown.authFailureCount} 次失敗
                </span>
              </div>

              {report.authBreakdown.recentFailures.length === 0 ? (
                <p className="mt-5 text-sm text-zinc-500">
                  目前尚無註冊或登入錯誤事件紀錄。
                </p>
              ) : (
                <div className="mt-4 divide-y divide-zinc-100 text-xs">
                  {report.authBreakdown.recentFailures.map((item, index) => (
                    <div
                      key={`${item.code}-${item.createdAtIso}-${index}`}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div>
                        <span className="font-mono font-semibold text-rose-700">
                          {item.code}
                        </span>
                        <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-zinc-600">
                          {item.mode} · {item.method}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-500">
                        {formatShortTime(item.createdAtIso)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {tab === "landings" ? (
        <div className="space-y-8">
          {/* Landing Page Performance Table */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="font-display text-xl font-bold text-[#12141c]">
              各著陸頁進站與轉換表現 (Landing Page Entry & Auth Conversion)
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              分析訪客從哪一個公開頁面進站、單頁跳出率 (Bounce Rate)、點擊註冊/登入頁人數，以及最終完成註冊或登入的轉換率。
            </p>

            {report.landingPages.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">
                尚無公開著陸頁瀏覽紀錄。
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse whitespace-nowrap text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 font-semibold uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-3">著陸頁路由 (Landing Path)</th>
                      <th className="px-3 py-3">總瀏覽量 (PV)</th>
                      <th className="px-3 py-3">不重複訪客 (UV)</th>
                      <th className="px-3 py-3">作為首站進站數</th>
                      <th className="px-3 py-3">單頁跳出率 (Bounce)</th>
                      <th className="px-3 py-3">進入註冊/登入頁</th>
                      <th className="px-3 py-3">完成註冊/登入 (轉換率)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {report.landingPages.map((row) => (
                      <tr key={row.path} className="hover:bg-zinc-50/80">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-[#12141c]">
                            {row.label}
                          </div>
                          <div className="font-mono text-[11px] text-zinc-500">
                            {row.path}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono font-semibold text-zinc-800">
                          {row.totalViews}
                        </td>
                        <td className="px-3 py-3 font-mono text-zinc-700">
                          {row.uniqueVisitors}
                        </td>
                        <td className="px-3 py-3 font-mono text-zinc-700">
                          {row.entrySessions}
                        </td>
                        <td className="px-3 py-3 font-mono">
                          <span
                            className={
                              row.bounceRatePercent >= 70
                                ? "font-semibold text-rose-600"
                                : "text-zinc-700"
                            }
                          >
                            {row.bounceRatePercent}%
                          </span>{" "}
                          <span className="text-zinc-400">
                            ({row.bounceSessions}/{row.entrySessions})
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-amber-700">
                          {row.reachedAuthVisitors} 人
                        </td>
                        <td className="px-3 py-3 font-mono">
                          <strong className="text-emerald-700">
                            {row.convertedVisitors} 人
                          </strong>{" "}
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {row.conversionRatePercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Traffic Sources & Locale Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold text-[#12141c]">
                流量來源管道與轉換 (Referrer Channels)
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                區分直接流量、自然搜尋、AI 搜尋推薦 (ChatGPT / Perplexity / Claude) 與社群媒體的進站轉換率。
              </p>
              {report.referrers.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">尚無來源資料。</p>
              ) : (
                <div className="mt-4 divide-y divide-zinc-100 text-xs">
                  {report.referrers.map((ref) => (
                    <div
                      key={`${ref.channel}-${ref.host}`}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div>
                        <span className="font-semibold text-[#12141c]">
                          {ref.channel}
                        </span>
                        <span className="ml-2 font-mono text-zinc-500">
                          {ref.host}
                        </span>
                      </div>
                      <div className="font-mono text-zinc-700">
                        {ref.visitors} 訪客 ·{" "}
                        <strong className="text-emerald-700">
                          轉換 {ref.convertedVisitors} 人 ({ref.conversionRatePercent}%)
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold text-[#12141c]">
                訪客語系分佈 (Visitor Locales)
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                依進站時 HTML `lang` / `?hl=` 語系參數統計各語言訪客佔比。
              </p>
              {report.locales.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">尚無語系資料。</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {report.locales.map((item) => (
                    <div key={item.locale}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-[#12141c]">
                          {item.locale}
                        </span>
                        <span className="font-mono text-zinc-600">
                          {item.visitors} 人 ({item.sharePercent}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-[#12141c]"
                          style={{ width: `${Math.max(3, item.sharePercent)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {tab === "visitors" ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#12141c]">
                訪客進站路徑與註冊明細 ({filteredVisitors.length} 位訪客)
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                追蹤每位訪客的首個進站著陸頁、完整頁面軌跡、是否完成註冊/登入，以及是否進入 `/app` 工作台。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="visitor-outcome-filter"
                className="text-xs font-semibold text-zinc-600"
              >
                篩選轉換狀態：
              </label>
              <select
                id="visitor-outcome-filter"
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800"
              >
                <option value="all">全部訪客 ({report.recentVisitors.length})</option>
                <option value="signed_up">完成註冊 (Signed Up)</option>
                <option value="logged_in">完成登入 (Logged In)</option>
                <option value="authenticated_session">已登入工作階段</option>
                <option value="auth_abandoned">進入驗證頁未完成 (Abandoned Auth)</option>
                <option value="browsing">僅瀏覽官網 (Browsing Only)</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-3 py-3">訪客 / 綁定帳號</th>
                  <th className="px-3 py-3">轉換結果</th>
                  <th className="px-3 py-3">首站進站頁 (Entry)</th>
                  <th className="px-3 py-3">來源 / 語系</th>
                  <th className="px-3 py-3">瀏覽軌跡 (Path Trail)</th>
                  <th className="px-3 py-3">登入後工作台</th>
                  <th className="px-3 py-3">最後活動時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredVisitors.map((v) => {
                  const badge = outcomeBadge(v.authOutcome);
                  return (
                    <tr key={v.visitorKey} className="hover:bg-zinc-50/80">
                      <td className="px-3 py-3">
                        {v.userEmail ? (
                          <div>
                            <span className="font-semibold text-[#12141c]">
                              {v.userEmail}
                            </span>
                            {v.anonId ? (
                              <span className="ml-1.5 font-mono text-[10px] text-zinc-400">
                                ({v.anonId.slice(0, 12)}…)
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="font-mono text-zinc-600">
                            {v.anonId ? `${v.anonId.slice(0, 16)}…` : v.visitorKey.slice(0, 16)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono font-semibold text-[#12141c]">
                        {v.entryPath}
                      </td>
                      <td className="px-3 py-3 text-zinc-600">
                        <span className="font-mono">{v.referrerHost}</span> ·{" "}
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px]">
                          {v.locale}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-zinc-700">
                        {v.pathTrail.join(" → ") || v.entryPath}
                      </td>
                      <td className="px-3 py-3">
                        {v.reachedStudio ? (
                          <Link
                            href="/scroadmin/analytics"
                            className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:underline"
                          >
                            已進入 /app → 查看創作流向
                          </Link>
                        ) : (
                          <span className="text-zinc-400">未進入</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-zinc-500">
                        {formatShortTime(v.lastSeenIso)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
