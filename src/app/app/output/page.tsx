import { OutputList } from "@/presentation/components/app/output/output-list";
import { requireAppUser } from "@/service/auth";
import { listOutputs } from "@/service/output/list";

export const dynamic = "force-dynamic";

// Every finished image, video, and audio file for the signed-in account.
export default async function OutputPage() {
  const user = await requireAppUser();
  const items = await listOutputs(user.clerkUserId);
  return <OutputList items={items} />;
}
