"use client";

import { useState } from "react";
import type { UxDiagnosticsReport } from "@/service/analytics/ux-diagnostics";

function severityBadgeClass(
  severity: "high" | "medium" | "low" | "healthy",
): string {
  switch (severity) {
    case "high":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "low":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function formatShortTime(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return "—";
  return date.toLocaleString("zh-HK", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Interactive UX Funnel & Drop-off Diagnostics view for `/scroadmin/analytics`.
export function UxAnalyticsDashboard({
  report,
}: {
  report: UxDiagnosticsReport;
}) {
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [tab, setTab] = useState<"diagnosis" | "users" | "events">("diagnosis");

  const filteredUsers =
    selectedStage === "all"
      ? report.users
      : report.users.filter((u) => u.diagnosis.stageId === selectedStage);

  return (
    <div className="space-y-8">
      {/* Top KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            註冊用戶總數 (Total Users)
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-[#12141c]">
            {report.kpis.totalUsers}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            近 7 日活躍：{report.kpis.activeUsers7d} 人
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            成功產出率 (Activation Rate)
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">
            {report.kpis.activationRatePercent}%
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            已產出影片或日常照：{report.kpis.activatedUsers} 人
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            UX 事件紀錄 (MongoDB ux_events)
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-[#12141c]">
            {report.kpis.totalEventsLogged}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            同步發送至 GA4 + MongoDB
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
            阻斷與失敗次數 (Blockers & Errors)
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-rose-600">
            {report.kpis.blockerEventsCount +
              report.kpis.failedGenerationJobsCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            UX 阻斷 {report.kpis.blockerEventsCount} · 任務失敗{" "}
            {report.kpis.failedGenerationJobsCount}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("diagnosis")}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "diagnosis"
              ? "bg-[#12141c] text-[#c6f24b]"
              : "bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          1. 全路徑轉換漏斗與流失原因診斷
        </button>
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "users"
              ? "bg-[#12141c] text-[#c6f24b]"
              : "bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          2. 逐一用戶卡關檢查表 ({report.users.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("events")}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "events"
              ? "bg-[#12141c] text-[#c6f24b]"
              : "bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          3. 即時 UX 事件流與阻斷紀錄 ({report.recentEvents.length})
        </button>
      </div>

      {tab === "diagnosis" ? (
        <div className="space-y-8">
          {/* Section A: 7-Step Activation Funnel */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="font-display text-xl font-bold text-[#12141c]">
              全路徑轉換漏斗 (End-to-End UX Funnel)
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              追蹤用戶從註冊、同意條款、建立角色/影片、AI 分鏡、生成首尾幀圖片到最終影片產出的每一步留存與流失率。
            </p>
            <div className="mt-6 space-y-4">
              {report.funnel.map((step, idx) => (
                <div
                  key={step.stepId}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#12141c]">
                      {step.label}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono font-bold text-[#12141c]">
                        {step.userCount} 人 ({step.conversionFromTopPercent}%)
                      </span>
                      {idx > 0 && step.dropOffCount > 0 ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 font-semibold text-rose-700">
                          在此步流失 -{step.dropOffCount} 人 (-
                          {step.dropOffPercent}%)
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
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

          {/* Section B: Why Users Stop Using (Automated Diagnosis Cards) */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold text-[#12141c]">
                  為什麼用戶沒有繼續使用？(卡關階段自動診斷)
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  點擊任一原因可直接篩選查看受影響的用戶名單與改善建議。
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {report.stuckStages.map((stage) => (
                <div
                  key={stage.stageId}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200 p-5 transition hover:border-zinc-400"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityBadgeClass(stage.severity)}`}
                      >
                        {stage.userCount} 人 ({stage.percentOfUsers}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStage(stage.stageId);
                          setTab("users");
                        }}
                        className="cursor-pointer text-xs font-semibold text-zinc-600 underline hover:text-[#12141c]"
                      >
                        查看這 {stage.userCount} 位用戶 →
                      </button>
                    </div>
                    <h3 className="mt-3 font-display text-base font-bold text-[#12141c]">
                      {stage.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-5 text-zinc-600">
                      <strong className="text-zinc-800">現況原因：</strong>
                      {stage.reason}
                    </p>
                  </div>
                  <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-700">
                    <strong className="text-[#12141c]">UX 改善建議：</strong>
                    {stage.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section C: Drop-off Pages & Blocker Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold text-[#12141c]">
                常見離開頁面 (Last Visited Page Before Exit)
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                統計訪客與用戶在單次工作階段最後停留的路由。
              </p>
              {report.dropOffPages.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                  尚無頁面瀏覽事件紀錄（當用戶開始瀏覽後會自動寫入）。
                </p>
              ) : (
                <div className="mt-4 divide-y divide-zinc-100 text-sm">
                  {report.dropOffPages.map((item) => (
                    <div
                      key={item.path}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="font-mono text-xs text-zinc-800">
                        {item.path}
                      </span>
                      <span className="text-xs text-zinc-500">
                        離開 <strong className="text-rose-600">{item.exitCount}</strong> 次 / 瀏覽{" "}
                        {item.totalViews} 次
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold text-[#12141c]">
                UX 阻斷與錯誤排行 (Top Blockers)
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                記錄點數不足彈窗、分鏡失敗、生圖/生片失敗等阻礙用戶繼續使用的事件。
              </p>
              {report.blockers.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                  目前尚無新觸發的 UX 阻斷事件。
                </p>
              ) : (
                <div className="mt-4 divide-y divide-zinc-100 text-sm">
                  {report.blockers.map((b) => (
                    <div key={b.event} className="py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-rose-700">
                          {b.event}
                        </span>
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                          {b.count} 次
                        </span>
                      </div>
                      {b.lastError ? (
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          最新錯誤：{b.lastError}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#12141c]">
                用戶旅程與卡關明細 ({filteredUsers.length} 人)
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                整合每位用戶的點數、角色、影片分鏡、首尾幀、成片與失敗任務數量，直接定位停止使用的原因。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="stage-filter" className="text-xs font-semibold text-zinc-600">
                篩選卡關階段：
              </label>
              <select
                id="stage-filter"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800"
              >
                <option value="all">全部用戶 ({report.users.length})</option>
                {report.stuckStages.map((s) => (
                  <option key={s.stageId} value={s.stageId}>
                    {s.title} ({s.userCount})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse whitespace-nowrap text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="whitespace-nowrap px-3 py-3">用戶 (Email / 名稱)</th>
                  <th className="whitespace-nowrap px-3 py-3">診斷卡關階段</th>
                  <th className="whitespace-nowrap px-3 py-3">剩餘點數</th>
                  <th className="whitespace-nowrap px-3 py-3">角色 (完成/總數)</th>
                  <th className="whitespace-nowrap px-3 py-3">影片進度 (草稿→分鏡→圖→片)</th>
                  <th className="whitespace-nowrap px-3 py-3">Life 照片</th>
                  <th className="whitespace-nowrap px-3 py-3">失敗任務</th>
                  <th className="whitespace-nowrap px-3 py-3">最後頁面 / 活躍時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.map((u) => (
                  <tr key={u.clerkUserId} className="hover:bg-zinc-50/80">
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="font-semibold text-[#12141c]">{u.email}</span>
                      {u.name ? (
                        <span className="ml-2 text-[11px] text-zinc-500">
                          ({u.name})
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${severityBadgeClass(u.diagnosis.severity)}`}
                      >
                        {u.diagnosis.title}
                      </span>
                      <span className="ml-2 text-[11px] text-zinc-500">
                        {u.diagnosis.reason}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-zinc-800">
                      {u.credits}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-zinc-700">
                      {u.completedCharacterCount} / {u.characterCount}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-zinc-700">
                      {u.videoCount} → {u.storyboardReadyCount} →{" "}
                      {u.keyframeReadyCount} →{" "}
                      <strong className="text-emerald-700">
                        {u.clipVideoReadyCount}
                      </strong>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-zinc-700">
                      {u.lifeShotCount}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono">
                      {u.failedJobCount > 0 ? (
                        <span className="font-bold text-rose-600">
                          {u.failedJobCount}
                        </span>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-zinc-600">
                      <span className="text-[11px] text-zinc-500">
                        {formatShortTime(u.lastActiveAt)}
                      </span>
                      {u.lastPath ? (
                        <span className="ml-2 font-mono text-[11px] text-zinc-800">
                          {u.lastPath} ({u.lastEvent})
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "events" ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="font-display text-xl font-bold text-[#12141c]">
            即時 UX 事件流 (MongoDB `ux_events`)
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            最新 80 筆來自前端 (GA4 同步) 與 Server Actions 的操作及錯誤事件。
          </p>
          {report.recentEvents.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              尚無事件紀錄。當用戶瀏覽頁面或觸發操作時會即時顯示於此。
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse whitespace-nowrap text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="whitespace-nowrap px-3 py-2.5">時間</th>
                    <th className="whitespace-nowrap px-3 py-2.5">分類 / 來源</th>
                    <th className="whitespace-nowrap px-3 py-2.5">事件名稱 (Event)</th>
                    <th className="whitespace-nowrap px-3 py-2.5">用戶</th>
                    <th className="whitespace-nowrap px-3 py-2.5">路徑 (Path)</th>
                    <th className="whitespace-nowrap px-3 py-2.5">詳細參數 (Params)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {report.recentEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-zinc-500">
                        {formatShortTime(ev.createdAtIso)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-700">
                          {ev.category} · {ev.source}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold text-[#12141c]">
                        {ev.event}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">
                        {ev.userEmail || ev.clerkUserId || "訪客 (Anon)"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-zinc-600">
                        {ev.path || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-zinc-500">
                        {ev.paramsSummary || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
