import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getPublishedBlogPostBySlug } from "@/service/blog-post/blog-posts";
import { getBlogPostPublicPath } from "@/service/blog-post/public-path";
import { BlogPostContent } from "@/app/posts/[slug]/blog-post-content";

function formatDetailDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

type PostListingKind = "posts" | "articles";

function listingHref(kind: PostListingKind): string {
  return kind === "articles" ? "/articles" : "/posts";
}

function listingLabel(kind: PostListingKind): string {
  return kind === "articles" ? "Articles" : "Posts";
}

export async function buildPostDetailMetadata(slug: string): Promise<Metadata> {
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) {
    return {
      title: "Post Not Found | Scro",
    };
  }

  const canonicalPath = getBlogPostPublicPath(post.slug);
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

// Shared blog post detail layout for /posts and /articles routes.
export async function PostDetailView({
  slug,
  listingKind,
}: {
  slug: string;
  listingKind: PostListingKind;
}) {
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: [post.featureImage],
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    keywords: post.tags.join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.scro.io${getBlogPostPublicPath(post.slug)}`,
    },
  };

  const backHref = listingHref(listingKind);
  const backLabel = listingLabel(listingKind);

  return (
    <PolicyLayout>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            ← Back to {backLabel}
          </Link>
        </div>

        <header className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <time dateTime={post.createdAt}>{formatDetailDate(post.createdAt)}</time>
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
          <img
            src={post.featureImage}
            alt={post.title}
            className="max-h-[30rem] w-full object-cover"
          />
        </div>

        <BlogPostContent content={post.content} />
      </article>
    </PolicyLayout>
  );
}
