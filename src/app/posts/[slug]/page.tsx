import type { Metadata } from "next";
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
import { BlogPostLinks } from "@/app/posts/[slug]/blog-post-links";
import { blogPostLanguageAlternates } from "@/service/blog-post/translations";
import { getSiteUrl } from "@/util/app-url";
import { getMessages } from "@/util/i18n";
import { isLocaleId } from "@/util/i18n/locales";
import { getRequestLocale } from "@/util/i18n/request-locale";
import { openGraphLocale, postDocumentTitle, socialImage } from "@/util/seo/public-metadata";

export const dynamic = "force-dynamic";

type PostDetailPageProps = {
  params: Promise<{ slug: string }>;
};

async function getBlogLocaleAndCopy() {
  const locale = await getRequestLocale();
  return { locale, copy: getMessages(locale).blogPage };
}

// Generate SEO metadata (title, description, OpenGraph, Twitter Card, canonical URL) from the post slug.
export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [post, { locale, copy }] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getBlogLocaleAndCopy(),
  ]);
  if (!post) {
    return {
      title: copy.notFoundTitle,
    };
  }

  const canonicalPath = `/posts/${encodeURIComponent(post.slug)}`;
  const title = postDocumentTitle(post.title);
  const languages = blogPostLanguageAlternates(post);
  const effectiveLocale = isLocaleId(post.locale) ? post.locale : locale;
  return {
    title,
    description: post.excerpt,
    alternates: {
      canonical: canonicalPath,
      ...(languages ? { languages } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      siteName: "Scro",
      url: canonicalPath,
      locale: openGraphLocale(effectiveLocale),
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      images: post.featureImage
        ? [{ url: post.featureImage, alt: post.title }]
        : socialImage(post.title),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.featureImage ? [post.featureImage] : ["/opengraph-image"],
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
  const siteUrl = getSiteUrl();
  const postUrl = `${siteUrl}/posts/${encodeURIComponent(post.slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${postUrl}#article`,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": postUrl,
        },
        headline: post.title,
        description: post.excerpt,
        image: post.featureImage ? [post.featureImage] : [`${siteUrl}/opengraph-image`],
        datePublished: post.createdAt,
        dateModified: post.updatedAt,
        author: {
          "@type": "Organization",
          name: "Scro",
          url: siteUrl,
        },
        publisher: {
          "@type": "Organization",
          name: "Scro",
          url: siteUrl,
          logo: {
            "@type": "ImageObject",
            url: `${siteUrl}/icon.svg`,
          },
        },
        keywords: post.tags.join(", "),
        inLanguage: post.locale,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Scro", item: siteUrl },
          { "@type": "ListItem", position: 2, name: copy.title, item: `${siteUrl}/posts` },
          { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
        ],
      },
    ],
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
            className="inline-flex items-center text-sm font-medium text-zinc-400 transition-colors hover:text-[#c6f24b]"
          >
            {copy.backToPosts}
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left/Main Column: Article Content + In-Article & Bottom Register CTAs */}
          <article lang={post.locale} className="min-w-0 lg:col-span-8">
            <header className="mb-8">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <time dateTime={post.createdAt}>{formatDetailDate(post.createdAt, locale)}</time>
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/posts?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-medium text-zinc-300 transition-colors hover:border-[#c6f24b]/50 hover:bg-[#c6f24b]/10 hover:text-[#c6f24b]"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {post.title}
              </h1>
              {post.excerpt ? (
                <p className="mt-4 text-lg leading-relaxed text-zinc-300">{post.excerpt}</p>
              ) : null}
              <BlogPostLinks post={post} productLabel={copy.productLink} />
            </header>

            <div className="mb-10 aspect-16/10 overflow-hidden rounded-2xl border border-white/10 bg-[#131722]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.featureImage}
                alt={post.title}
                width={1600}
                height={1000}
                className="h-full w-full object-cover"
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
