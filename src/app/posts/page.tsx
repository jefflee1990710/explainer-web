import type { Metadata } from "next";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { PublicPageJsonLd } from "@/presentation/components/seo/public-page-json-ld";
import { listBlogPostsPaginated, PUBLIC_BLOG_PAGE_SIZE } from "@/service/blog-post/blog-posts";
import { BlogPostGrid } from "@/app/posts/blog-post-grid";
import { BlogPostPagination } from "@/app/posts/blog-post-pagination";
import { getMessages } from "@/util/i18n";
import { getRequestLocale } from "@/util/i18n/request-locale";
import { publicPageMetadata } from "@/util/seo/public-metadata";
import { getSiteUrl } from "@/util/app-url";

export const dynamic = "force-dynamic";

async function getBlogLocaleAndCopy() {
  const locale = await getRequestLocale();
  return { locale, copy: getMessages(locale).blogPage };
}

function postsIndexPath(page: number, tag?: string, q?: string, limit?: number): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (tag) params.set("tag", tag);
  if (q) params.set("q", q);
  if (limit && limit !== PUBLIC_BLOG_PAGE_SIZE) params.set("limit", String(limit));
  const qs = params.toString();
  return qs ? `/posts?${qs}` : "/posts";
}

export async function generateMetadata({ searchParams }: PostsPageProps): Promise<Metadata> {
  const [sp, { locale, copy }] = await Promise.all([
    searchParams,
    getBlogLocaleAndCopy(),
  ]);
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const limit = Math.max(1, Math.floor(Number(sp.limit) || PUBLIC_BLOG_PAGE_SIZE));
  const tag = typeof sp.tag === "string" ? sp.tag.trim() : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const isFilter = Boolean(tag || q || (sp.limit && limit !== PUBLIC_BLOG_PAGE_SIZE));
  const path = isFilter ? postsIndexPath(page, tag, q, limit) : page > 1 ? `/posts?page=${page}` : "/posts";
  const title = !isFilter && page > 1 ? `${copy.seoTitle} (${page})` : copy.seoTitle;

  return publicPageMetadata({
    title,
    description: copy.seoDescription,
    path,
    locale,
    index: !isFilter,
  });
}

type PostsPageProps = {
  searchParams: Promise<{ page?: string; limit?: string; tag?: string; q?: string }>;
};

// Public /posts listing page with pagination rendered inside PolicyLayout.
export default async function PostsPage({ searchParams }: PostsPageProps) {
  const sp = await searchParams;
  const page = Number(sp.page || "1");
  const limit = Number(sp.limit || String(PUBLIC_BLOG_PAGE_SIZE));
  const tag = typeof sp.tag === "string" ? sp.tag : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const [paginated, { copy }] = await Promise.all([
    listBlogPostsPaginated({ page, limit, tag, q }),
    getBlogLocaleAndCopy(),
  ]);
  const siteUrl = getSiteUrl();
  const customLimit = Boolean(sp.limit && Number(sp.limit) !== PUBLIC_BLOG_PAGE_SIZE);
  const isFilter = Boolean((tag && tag.trim()) || (q && q.trim()) || customLimit);
  const blogJsonLd = isFilter
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: copy.seoTitle,
        description: copy.seoDescription,
        url: `${siteUrl}/posts`,
        blogPost: paginated.posts.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          url: `${siteUrl}/posts/${encodeURIComponent(post.slug)}`,
          datePublished: post.createdAt,
          image: post.featureImage ? [post.featureImage] : undefined,
        })),
      };

  return (
    <PolicyLayout>
      {blogJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />
      ) : null}
      {!isFilter && paginated.page <= 1 ? (
        <PublicPageJsonLd path="/posts" title={copy.seoTitle} description={copy.seoDescription} />
      ) : null}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 text-base text-zinc-600">
            {copy.subtitle}
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
