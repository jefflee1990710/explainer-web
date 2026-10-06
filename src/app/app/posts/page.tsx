import { requireAppUser } from "@/service/auth";
import { listOwnedPosts, toPublicPost } from "@/service/post/create-post";
import { POSTER_LAYOUTS } from "@/service/post/layouts";
import { loadStudioPickers } from "@/service/project/load-folder-studio";
import { PostList } from "@/presentation/components/app/posts/post-list";

export default async function PostsPage() {
  const user = await requireAppUser();
  const [docs, pickers] = await Promise.all([listOwnedPosts(user.clerkUserId), loadStudioPickers(user)]);
  return (
    <PostList
      posts={docs.map((post) => toPublicPost(post))}
      layouts={POSTER_LAYOUTS.map((layout) => ({ id: layout.id, blueprintPath: layout.blueprintPath }))}
      styles={pickers.styles}
      characters={pickers.characters}
      products={pickers.products}
    />
  );
}
