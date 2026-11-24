import { redirect } from "next/navigation";

// https://www.scro.io/app opens the canvas. Login lands here when no deeper path was requested.
export default function DashboardPage() {
  redirect("/app/canvas");
}
