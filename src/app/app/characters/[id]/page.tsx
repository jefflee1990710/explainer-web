import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { CharacterWorkspaceLoader } from "@/presentation/components/app/characters/[id]/character-workspace-loader";

// The URL opens immediately. The workspace fetches its own data after paint.
export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();
  return <CharacterWorkspaceLoader key={id} id={id} />;
}
