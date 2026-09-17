import { redirect } from "next/navigation";
import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { skillsCollection } from "@/lib/collections";
import { toPublicSkill } from "@/lib/serialize";
import { NewProjectForm } from "./new-project-form";

// Server actions from this page schedule LLM + video jobs via after();
// give the function enough headroom to finish them after responding.
export const maxDuration = 120;

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const params = await searchParams;
  const slug = typeof params.skill === "string" ? params.skill : "";
  const skills = await skillsCollection();
  const skill = await skills.findOne({
    slug: slug || "cartoon-explainer-video-director",
    isActive: true,
  });
  if (!skill) redirect("/app/skills");

  const user = await requireAppUser();
  const sub = await getActiveSubscription(user.clerkUserId);

  return (
    <div>
      <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
        {skill.title}
      </p>
      <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">
        {skill.titleZh}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        填好題材與設定後，AI 會先寫分鏡給你確認；核准後才會在這頁直接開始產片。
      </p>
      <NewProjectForm
        skill={toPublicSkill(skill)}
        credits={user.credits}
        subscribed={isSubscriptionActive(sub)}
      />
    </div>
  );
}
