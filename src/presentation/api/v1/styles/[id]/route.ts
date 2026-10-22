import { notFound } from "next/navigation";
import { isStyleId } from "@/model/style-id";
import { getStyleById } from "@/service/style/catalog";
import { apiError, apiJson, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";

type Params = { id: string };

export const GET = withApiUser<Params>(async ({ auth, params }) => {
  if (!isStyleId(params.id)) return apiError("找不到 Style", 404);
  const style = getStyleById(params.id);
  const sub = await getActiveSubscription(auth.user.clerkUserId);
  return apiJson({ style, subscribed: isSubscriptionActive(sub) });
});

export const PUT = withApiUser<Params>(async () => {
  notFound();
});

export const POST = withApiUser<Params>(async () => {
  notFound();
});

export const DELETE = withApiUser<Params>(async () => {
  notFound();
});
