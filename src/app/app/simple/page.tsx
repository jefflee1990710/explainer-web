import { SimpleVideoStudio } from "@/presentation/components/app/simple/simple-video-studio";
import { toPublicCharacter } from "@/presentation/serialize";
import { charactersCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";
import { listPublicStyles } from "@/service/style/list";

export const dynamic = "force-dynamic";

export default async function SimpleVideoPage() {
  const user = await requireAppUser();
  const [charDocs, styles] = await Promise.all([
    charactersCollection().then((col) =>
      col.find({ clerkUserId: user.clerkUserId }).sort({ updatedAt: -1 }).limit(50).toArray(),
    ),
    listPublicStyles(),
  ]);
  const characters = charDocs.map((doc) => toPublicCharacter(doc));
  return <SimpleVideoStudio characters={characters} styles={styles} />;
}
