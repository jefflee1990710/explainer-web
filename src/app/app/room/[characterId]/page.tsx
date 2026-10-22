import { redirect } from "next/navigation";
import { loadRoomData } from "@/app/app/room/load-room-data";
import { RoomDesk } from "@/presentation/components/app/room/room-desk";

// Fitting room for one character. Switching characters changes this path.
export default async function RoomCharacterPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const { characterId } = await params;
  const data = await loadRoomData();
  if (!data.characters.some((item) => item.id === characterId)) redirect("/app/room");

  return <RoomDesk key={characterId} {...data} characterId={characterId} />;
}
