import { apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { listSelectableStyles } from "@/service/style/list";
import { createUserStyleAction } from "@/service/style/user-style-actions";

// Visual style library: system catalog then the user's own styles.
export const GET = withApiUser(async ({ auth }) => {
  const [{ system, mine }, sub] = await Promise.all([
    listSelectableStyles(auth.user.clerkUserId),
    getActiveSubscription(auth.user.clerkUserId),
  ]);
  return apiJson({ system, mine, subscribed: isSubscriptionActive(sub) });
});

// Fork a system style into a new custom style. Body: { baseStyleId, name, description }.
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<{ baseStyleId?: string; name?: string; description?: string }>(request);
  return fromResult(
    await createUserStyleAction({
      baseStyleId: String(body.baseStyleId ?? ""),
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
    }),
    201,
  );
});
