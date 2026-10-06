import { notFound } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { loadOwnedPost, toPublicPost } from "@/service/post/create-post";
import { PostEditor } from "@/presentation/components/app/posts/post-editor";

export default async function PostEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAppUser();
  const post = await loadOwnedPost(id, user.clerkUserId);
  if (!post) notFound();
  return <PostEditor post={toPublicPost(post)} />;
}
