import type { PostActivationReport } from "@/service/analytics/ux-diagnostics";

// Breakdown of what activated producers click after their first finished output.
export function PostActivationPanel({
  postActivation,
}: {
  postActivation: PostActivationReport;
}) {
  const trackedClicks = postActivation.actions.reduce((sum, action) => sum + action.count, 0);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="font-display text-xl font-bold text-[#12141c]">
        產出後行為 (After Activated Producer)
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        已成功產出內容的 {postActivation.activatedUserCount} 位用戶，在最近 500 筆 UX 事件裡做了什麼、點了什麼。
        共 {trackedClicks} 次產出後動作。
      </p>
      <div className="mt-4 divide-y divide-zinc-100 text-sm">
        {postActivation.actions.map((action) => (
          <div key={action.event} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="font-semibold text-[#12141c]">{action.label}</p>
              <p className="truncate font-mono text-[11px] text-zinc-500">{action.event}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-zinc-600">
              <span className="font-mono font-bold text-[#12141c]">{action.count}</span> 次
              <span className="mx-1.5 text-zinc-300">·</span>
              <span className="font-mono font-bold text-emerald-700">{action.uniqueUsers}</span> 人
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
