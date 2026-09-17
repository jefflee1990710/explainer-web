import Link from "next/link";
import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { projectsCollection } from "@/lib/collections";
import { toPublicProject } from "@/lib/serialize";
import { ProjectGrid } from "./project-grid";

export default async function DashboardPage() {
  const user = await requireAppUser();
  const sub = await getActiveSubscription(user.clerkUserId);
  const subscribed = isSubscriptionActive(sub);
  const projects = await projectsCollection();
  const list = await projects
    .find({ clerkUserId: user.clerkUserId })
    .sort({ createdAt: -1 })
    .limit(120)
    .toArray();

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">專案</h1>
          <p className="mt-2 text-sm text-muted">
            {subscribed
              ? `目前方案可產片，剩餘 ${user.credits} credits。`
              : "尚未訂閱。你可以先寫分鏡，核准產片前需要方案。"}
          </p>
        </div>
        <Link
          href="/app/skills"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c]"
        >
          新增專案
        </Link>
      </div>

      {!subscribed ? (
        <div className="mt-6 rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 p-5 text-sm shadow-[4px_4px_0_0_rgba(255,77,46,0.2)]">
          還沒有有效訂閱。
          <Link href="/app/billing" className="ml-2 font-semibold underline">
            前往訂閱
          </Link>
        </div>
      ) : null}

      <div className="mt-8">
        <ProjectGrid projects={list.map(toPublicProject)} />
      </div>
    </div>
  );
}
