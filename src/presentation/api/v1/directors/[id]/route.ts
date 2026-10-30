import { notFound } from "next/navigation";
import { getDirectorById, getDirectorBySlug } from "@/service/director/catalog";
import { directorAsSkill } from "@/service/director/catalog-skill";
import { directorKeptPrivate, loadPrivateDirectorSlugs } from "@/service/director/director-visibility";
import { apiError, apiJson, withApiUser } from "@/service/api/respond";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { toPublicDirector } from "@/presentation/serialize";

type Params = { id: string };

export const GET = withApiUser<Params>(async ({ auth, params }) => {
  const skill = getDirectorById(params.id) ?? getDirectorBySlug(params.id);
  if (!skill) return apiError("找不到 Director", 404);
  const privateSlugs = await loadPrivateDirectorSlugs();
  if (directorKeptPrivate(skill.slug, privateSlugs, auth.user.email)) {
    return apiError("找不到 Director", 404);
  }
  const sub = await getActiveSubscription(auth.user.clerkUserId);
  return apiJson({
    director: toPublicDirector(directorAsSkill(skill)),
    subscribed: isSubscriptionActive(sub),
  });
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
