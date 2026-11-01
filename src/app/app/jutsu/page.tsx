import { charactersCollection } from "@/dao";
import { JutsuStudio } from "@/presentation/components/app/jutsu/jutsu-studio";
import { toPublicCharacter } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { listCustomWardrobeItems } from "@/service/character/custom-wardrobe";
import { listJutsuJobs } from "@/service/jutsu/pipeline";

export const dynamic = "force-dynamic";

export default async function JutsuPage() {
  const user = await requireAppUser();
  const charCol = await charactersCollection();

  const [charDocs, customWardrobeItems, jobs] = await Promise.all([
    charCol
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .limit(60)
      .toArray(),
    listCustomWardrobeItems(user.clerkUserId),
    listJutsuJobs(user.clerkUserId, 24),
  ]);

  const characters = charDocs.map((doc) => toPublicCharacter(doc));

  return (
    <JutsuStudio
      characters={characters}
      customWardrobeItems={customWardrobeItems}
      initialJobs={jobs}
    />
  );
}
