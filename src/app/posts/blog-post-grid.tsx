import type { PublicBlogPost } from "@/model/blog-post";
import { BlogPostCard } from "@/app/posts/blog-post-card";

// Grid view displaying all published blog posts with their feature images.
export function BlogPostGrid({ posts }: { posts: PublicBlogPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-16 text-center">
        <p className="text-base font-medium text-zinc-700">No posts published yet.</p>
        <p className="mt-1 text-sm text-zinc-500">
          Create your first post via <code className="rounded bg-zinc-200/70 px-1.5 py-0.5 text-xs">POST /api/v1/posts</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <BlogPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
