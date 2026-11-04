import { redirect } from "next/navigation";
import { POSTS_FEATURE_ENABLED } from "@/service/post/feature";

export default async function PostEditorRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!POSTS_FEATURE_ENABLED) redirect("/app");
  const { id } = await params;
  redirect(`/app/posts?id=${encodeURIComponent(id)}`);
}
