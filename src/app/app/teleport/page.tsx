import { redirect } from "next/navigation";

export default function TeleportPage() {
  redirect("/app/canvas?template=teleport");
}
