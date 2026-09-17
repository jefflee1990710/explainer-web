import { redirect } from "next/navigation";

// Videos are created inside a folder workspace; keep this URL as a back-compat hop.
export default function NewProjectPage() {
  redirect("/app");
}
