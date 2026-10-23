import { CustomWardrobeStudio } from "@/presentation/components/app/wardrobe/custom-wardrobe-studio";
import { requireAppUser } from "@/service/auth";
import {
  CHARACTER_WARDROBE_PARTS,
  type CharacterWardrobePart,
} from "@/service/character/character-look";
import { listCustomWardrobeItems } from "@/service/character/custom-wardrobe";

export const dynamic = "force-dynamic";

export default async function CustomWardrobePage({
  searchParams,
}: {
  searchParams: Promise<{ part?: string }>;
}) {
  const user = await requireAppUser();
  const query = await searchParams;
  const items = await listCustomWardrobeItems(user.clerkUserId);
  const initialPart: CharacterWardrobePart = CHARACTER_WARDROBE_PARTS.includes(
    query.part as CharacterWardrobePart,
  )
    ? (query.part as CharacterWardrobePart)
    : "top";

  return <CustomWardrobeStudio initialItems={items} initialPart={initialPart} />;
}
