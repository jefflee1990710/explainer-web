import { notFound } from "next/navigation";
import { getAuthSession, requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import {
  loadDirectorForUser,
  toPublicDirectorWithPreview,
} from "@/service/director/director-actions";
import { DirectorWorkspace } from "@/presentation/components/app/directors/[id]/director-workspace";

export default async function DirectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const session = await getAuthSession();
  const skill = await loadDirectorForUser(user.clerkUserId, id);
  if (!skill) notFound();

  const [director, sub] = await Promise.all([
    toPublicDirectorWithPreview(skill),
    getActiveSubscription(user.clerkUserId),
  ]);

  return (
    <DirectorWorkspace
      director={director}
      subscribed={isSubscriptionActive(sub)}
      user={{ name: user.name, email: user.email, avatarUrl: session?.picture }}
    />
  );
}
