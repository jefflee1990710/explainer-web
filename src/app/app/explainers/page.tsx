import { redirect } from "next/navigation";

export default function ExplainersPage() {
  redirect("/app/canvas?template=explainer");
}
