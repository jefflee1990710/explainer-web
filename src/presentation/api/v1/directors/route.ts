import { apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { createDirectorAction } from "@/service/director/director-actions";
import { listSelectableSkills } from "@/service/director/selectable-skills";
import { toPublicSkills } from "@/presentation/serialize";

// Director library: system templates then the user's custom directors.
export const GET = withApiUser(async ({ auth }) => {
  const [skills, sub] = await Promise.all([
    listSelectableSkills(auth.user.clerkUserId),
    getActiveSubscription(auth.user.clerkUserId),
  ]);
  const published = toPublicSkills(skills);
  return apiJson({
    system: published.filter((skill) => !skill.isCustom),
    mine: published.filter((skill) => skill.isCustom),
    subscribed: isSubscriptionActive(sub),
  });
});

// Fork a system director. Body: { templateSlug, title, description }.
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<{ templateSlug?: string; title?: string; description?: string }>(request);
  return fromResult(
    await createDirectorAction({
      templateSlug: String(body.templateSlug ?? ""),
      title: String(body.title ?? ""),
      description: String(body.description ?? ""),
    }),
    201,
  );
});
