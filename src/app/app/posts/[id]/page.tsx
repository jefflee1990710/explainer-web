import { notFound, redirect } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { loadOwnedPost, toPublicPost } from "@/service/post/create-post";
import { POSTS_FEATURE_ENABLED } from "@/service/post/feature";
import { PostEditor } from "@/presentation/components/app/posts/post-editor";

export default async function PostEditorPage({ params }: { params: Promise<{ id: string }> }) {
  if (!POSTS_FEATURE_ENABLED) redirect("/app");
  const { id } = await params;
  const user = await requireAppUser();
  const post = await loadOwnedPost(id, user.clerkUserId);
  if (!post) notFound();
  return <PostEditor post={toPublicPost(post)} />;
}
