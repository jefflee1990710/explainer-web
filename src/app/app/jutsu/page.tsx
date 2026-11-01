import { redirect } from "next/navigation";

/** Legacy path — Scro Swap now lives at `/app/scroswap`. */
export default function JutsuRedirectPage() {
  redirect("/app/scroswap");
}
