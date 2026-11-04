import { redirect } from "next/navigation";
import { PostStudio } from "@/presentation/components/app/posts/post-studio";
import { requireAppUser } from "@/service/auth";
import { listOwnedPosts } from "@/service/post/create-post";
import { POSTS_FEATURE_ENABLED } from "@/service/post/feature";
import { loadStudioPickers } from "@/service/project/load-folder-studio";

export const dynamic = "force-dynamic";

export default async function PostsPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>;
}) {
  if (!POSTS_FEATURE_ENABLED) redirect("/app");
  const user = await requireAppUser();
  const [posts, pickers, resolvedParams] = await Promise.all([
    listOwnedPosts(user.clerkUserId),
    loadStudioPickers(user),
    searchParams ? searchParams : Promise.resolve({ id: undefined }),
  ]);
  return (
    <PostStudio
      initialPosts={posts}
      styles={pickers.styles}
      characters={pickers.characters}
      products={pickers.products}
      initialPostId={resolvedParams?.id}
    />
  );
}
