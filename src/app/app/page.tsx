import Link from "next/link";
import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { projectsCollection } from "@/lib/collections";
import { toPublicProject } from "@/lib/serialize";

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  phase_a: "撰寫分鏡中",
  awaiting_approval: "待核准",
  approved: "已核准",
  generating: "產片中",
  ready: "已完成",
  failed: "失敗",
};

export default async function DashboardPage() {
  const user = await requireAppUser();
  const sub = await getActiveSubscription(user.clerkUserId);
  const subscribed = isSubscriptionActive(sub);
  const projects = await projectsCollection();
  const list = await projects
    .find({ clerkUserId: user.clerkUserId })
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">專案</h1>
          <p className="mt-2 text-sm text-muted">
            {subscribed
              ? `目前方案可產片，剩餘 ${user.credits} credits。`
              : "尚未訂閱。你可以先寫分鏡，核准產片前需要方案。"}
          </p>
        </div>
        <Link
          href="/app/skills"
          className="rounded-full bg-accent px-4 py-2 text-sm text-white"
        >
          新增專案
        </Link>
      </div>

      {!subscribed ? (
        <div className="mt-6 rounded-2xl border border-line bg-card p-5 text-sm">
          還沒有有效訂閱。
          <Link href="/app/billing" className="ml-2 underline">
            前往訂閱
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-3">
        {list.length === 0 ? (
          <p className="text-sm text-muted">還沒有專案。先選一種風格開始。</p>
        ) : (
          list.map((project) => {
            const item = toPublicProject(project);
            return (
              <Link
                key={item.id}
                href={`/app/projects/${item.id}`}
                className="rounded-2xl border border-line bg-card p-5 hover:border-foreground"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {item.phaseA?.localizedTitle || item.phaseA?.englishTitle || "未命名專案"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{item.source}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {STATUS_LABEL[item.status] || item.status}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
