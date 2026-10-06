import { requireAppUser } from "@/service/auth";
import { listOwnedPosts, toPublicPost } from "@/service/post/create-post";
import { POSTER_LAYOUTS } from "@/service/post/layouts";
import { PostList } from "@/presentation/components/app/posts/post-list";

export default async function PostsPage() {
  const user = await requireAppUser();
  const docs = await listOwnedPosts(user.clerkUserId);
  return (
    <PostList
      posts={docs.map((post) => toPublicPost(post))}
      layouts={POSTER_LAYOUTS.map((layout) => ({ id: layout.id, blueprintPath: layout.blueprintPath }))}
    />
  );
}
