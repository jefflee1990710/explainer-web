import { TeleportStudio } from "@/presentation/components/app/teleport/teleport-studio";
import { requireAppUser } from "@/service/auth";
import { listTeleportJobs } from "@/service/teleport/pipeline";

export const dynamic = "force-dynamic";

export default async function TeleportPage() {
  const user = await requireAppUser();
  const jobs = await listTeleportJobs(user.clerkUserId, 24);
  return <TeleportStudio initialJobs={jobs} />;
}
