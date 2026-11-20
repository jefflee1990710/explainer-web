import { redirect } from "next/navigation";

export default function TalkingHeadsPage() {
  redirect("/app/canvas?template=talking-head");
}
