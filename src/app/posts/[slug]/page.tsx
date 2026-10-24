import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import {
  getPublishedBlogPostBySlug,
  listRecommendedBlogPosts,
} from "@/service/blog-post/blog-posts";
import { BlogPostContent } from "@/app/posts/[slug]/blog-post-content";
import { BlogPostRegisterCta } from "@/app/posts/[slug]/blog-post-register-cta";
import { BlogPostSidebar } from "@/app/posts/[slug]/blog-post-sidebar";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export const dynamic = "force-dynamic";

type PostDetailPageProps = {
  params: Promise<{ slug: string }>;
};

async function getBlogLocaleAndCopy() {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  return { locale, copy: getMessages(locale).blogPage };
}

// Generate SEO metadata (title, description, OpenGraph, Twitter Card, canonical URL) from the post slug.
export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [post, { copy }] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getBlogLocaleAndCopy(),
  ]);
  if (!post) {
    return {
      title: copy.notFoundTitle,
    };
  }

  const canonicalPath = `/posts/${encodeURIComponent(post.slug)}`;
  return {
    title: `${post.title} | Scro`,
    description: post.excerpt,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: canonicalPath,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      images: post.featureImage ? [{ url: post.featureImage, alt: post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.featureImage ? [post.featureImage] : undefined,
    },
  };
}

function formatDetailDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale || "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

// SEO-friendly blog post detail page resolved by `slug`, with right-hand Recommended Reading + Scro registration CTAs.
export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { slug } = await params;
  const [post, session, { locale, copy }] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getAuthSession(),
    getBlogLocaleAndCopy(),
  ]);
  if (!post) {
    notFound();
  }

  const signedIn = Boolean(session);
  const recommendedPosts = await listRecommendedBlogPosts(post, 5);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: [post.featureImage],
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    keywords: post.tags.join(", "),
  };

  return (
    <PolicyLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="mb-6">
          <Link
            href="/posts"
            className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            {copy.backToPosts}
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left/Main Column: Article Content + In-Article & Bottom Register CTAs */}
          <article className="min-w-0 lg:col-span-8">
            <header className="mb-8">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <time dateTime={post.createdAt}>{formatDetailDate(post.createdAt, locale)}</time>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                {post.title}
              </h1>
              {post.excerpt ? (
                <p className="mt-4 text-lg leading-relaxed text-zinc-600">{post.excerpt}</p>
              ) : null}
            </header>

            <div className="mb-10 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.featureImage}
                alt={post.title}
                className="max-h-[30rem] w-full object-cover"
              />
            </div>

            <BlogPostContent
              content={post.content}
              inlineCta={<BlogPostRegisterCta variant="inline" signedIn={signedIn} />}
              bottomCta={<BlogPostRegisterCta variant="bottom" signedIn={signedIn} />}
            />
          </article>

          {/* Right Column: Recommended Reading + Register Scro CTA underneath */}
          <div className="lg:col-span-4">
            <BlogPostSidebar
              recommendedPosts={recommendedPosts}
              signedIn={signedIn}
            />
          </div>
        </div>
      </div>
    </PolicyLayout>
  );
}
