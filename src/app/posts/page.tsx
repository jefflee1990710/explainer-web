import type { Metadata } from "next";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { listBlogPostsPaginated } from "@/service/blog-post/blog-posts";
import { BlogPostGrid } from "@/app/posts/blog-post-grid";
import { BlogPostPagination } from "@/app/posts/blog-post-pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Posts | Scro",
  description: "Read the latest articles, guides, and updates from Scro.",
  openGraph: {
    title: "Posts | Scro",
    description: "Read the latest articles, guides, and updates from Scro.",
    type: "website",
  },
};

type PostsPageProps = {
  searchParams: Promise<{ page?: string; limit?: string; tag?: string; q?: string }>;
};

// Public /posts listing page with pagination rendered inside PolicyLayout.
export default async function PostsPage({ searchParams }: PostsPageProps) {
  const sp = await searchParams;
  const page = Number(sp.page || "1");
  const limit = Number(sp.limit || "12");
  const tag = typeof sp.tag === "string" ? sp.tag : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const paginated = await listBlogPostsPaginated({ page, limit, tag, q });

  return (
    <PolicyLayout>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Blog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Posts
          </h1>
          <p className="mt-3 text-base text-zinc-600">
            Insights, tutorials, and stories on AI video creation and virtual influencers.
          </p>
        </header>
        <BlogPostGrid posts={paginated.posts} />
        <BlogPostPagination
          page={paginated.page}
          totalPages={paginated.totalPages}
          hasPrevPage={paginated.hasPrevPage}
          hasNextPage={paginated.hasNextPage}
          tag={tag}
          q={q}
        />
      </main>
    </PolicyLayout>
  );
}
