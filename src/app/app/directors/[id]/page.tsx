import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { getAuthSession, requireAppUser } from "@/service/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/service/billing/credits";
import { loadDirectorForUser, toPublicDirectorWithPreview } from "@/service/director/director-actions";
import { DirectorWorkspace } from "@/presentation/components/app/directors/[id]/director-workspace";

export default async function DirectorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const session = await getAuthSession();
  if (!ObjectId.isValid(id)) notFound();

  // System skills or the user's own directors only.
  const skill = await loadDirectorForUser(user.clerkUserId, id);
  if (!skill) notFound();

  const sub = await getActiveSubscription(user.clerkUserId);

  return (
    <DirectorWorkspace
      director={await toPublicDirectorWithPreview(skill)}
      subscribed={isSubscriptionActive(sub)}
      user={{ name: user.name, email: user.email, avatarUrl: session?.picture }}
    />
  );
}
