import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { listBlogPostsPaginated } from "@/service/blog-post/blog-posts";
import { BlogPostGrid } from "@/app/posts/blog-post-grid";
import { BlogPostPagination } from "@/app/posts/blog-post-pagination";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export const dynamic = "force-dynamic";

async function getBlogLocaleAndCopy() {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  return { locale, copy: getMessages(locale).blogPage };
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, copy } = await getBlogLocaleAndCopy();
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    alternates: {
      canonical: "/posts",
    },
    openGraph: {
      title: copy.seoTitle,
      description: copy.seoDescription,
      url: "/posts",
      siteName: "Scro",
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: copy.seoTitle,
      description: copy.seoDescription,
    },
  };
}

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

  const [paginated, { copy }] = await Promise.all([
    listBlogPostsPaginated({ page, limit, tag, q }),
    getBlogLocaleAndCopy(),
  ]);

  return (
    <PolicyLayout>
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
