import { redirect } from "next/navigation";
import { loadRoomData } from "@/app/app/room/load-room-data";
import { RoomDesk } from "@/presentation/components/app/room/room-desk";

// Opens the fitting room on the requested (legacy ?character=) or most recent character.
export default async function RoomPage({
  searchParams,
}: {
  searchParams: Promise<{ character?: string }>;
}) {
  const query = await searchParams;
  const data = await loadRoomData();
  const target =
    data.characters.find((item) => item.id === query.character) || data.characters[0];
  if (target) redirect(`/app/room/${target.id}`);

  return <RoomDesk {...data} characterId="" />;
}
