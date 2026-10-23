import type { PublicBlogPost } from "@/model/blog-post";

// Bundled SEO articles ship in the repo so they are live after deploy without a MongoDB seed.
export type BundledBlogPost = PublicBlogPost & {
  /** When set, the canonical public URL uses `/articles/` instead of `/posts/`. */
  articlesRoute: true;
};

const PUBLISHED_AT = "2026-10-23T12:00:00.000Z";

const WHERE_TO_DISCOVER_CONTENT = `Scro helps teams turn a brief into finished AI video—talking-head clips, explainers, UGC-style ads, tutorials, and SaaS product demos. You approve the storyboard scene by scene, then Scro renders the clips and assembles the reel.

We share Scro on independent AI tool directories so founders and marketers can compare options in one place. Below are the directories we list on or partner with for discovery (in alphabetical order).

## Directories featuring Scro

- [Dang.ai](https://dang.ai/) — curated AI tools and models
- [Twelve Tools](https://twelve.tools/) — hand-picked SaaS and AI utilities
- [Turbo0](https://turbo0.com/) — startup and AI tool listings
- [AI Toolz Dir](https://www.aitoolzdir.com/) — searchable AI software directory
- [ToolPilot](https://www.toolpilot.ai/) — AI tools with guides and comparisons
- [Toolfio](https://toolfio.com/) — AI product discovery
- [ToolDisk](https://tooldisk.com/) — directory of AI apps and workflows
- [Tulimoa](https://tulimoa.com/) — AI tools for creators and teams
- [Uno Directory](https://uno.directory/) — startup and AI tool catalog
- [EarlyHunt](https://earlyhunt.com/) — early-stage product launches
- [DailyPings](https://dailypings.com/) — daily startup and tool pings
- [Startup Fame](https://startupfa.me/) — startup showcase community
- [SaaSCity](https://saascity.io/) — SaaS and AI software hub
- [IndieLaunch](https://indielaunch.dev/) — indie maker launches and tools

If you run a directory and want to feature Scro, [contact us](/contact)—we are happy to verify listings and keep this page updated.

Learn more about Scro at [scro.io](https://www.scro.io/) or open the [studio](https://www.scro.io/app) to draft your first storyboard.`;

/** In-repo posts keyed by slug; MongoDB entries with the same slug take precedence at read time. */
export const BUNDLED_BLOG_POSTS: BundledBlogPost[] = [
  {
    id: "bundled-where-to-discover-scro",
    slug: "where-to-discover-scro",
    title: "Where to Discover Scro: AI Video Directories We List On",
    excerpt:
      "Scro creates AI video for talking-head, explainers, UGC, tutorials, and SaaS demos. These independent directories help teams find us.",
    content: WHERE_TO_DISCOVER_CONTENT,
    featureImage: "https://www.scro.io/logo.png",
    tags: ["directories", "ai-tools", "discovery"],
    published: true,
    createdAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
    articlesRoute: true,
  },
];

const bundledBySlug = new Map(BUNDLED_BLOG_POSTS.map((post) => [post.slug, post]));

export function getBundledBlogPostBySlug(slug: string): BundledBlogPost | null {
  return bundledBySlug.get(slug) ?? null;
}

export function listBundledBlogPosts(): BundledBlogPost[] {
  return BUNDLED_BLOG_POSTS.filter((post) => post.published);
}

export function isArticlesRouteSlug(slug: string): boolean {
  const bundled = bundledBySlug.get(slug);
  return bundled?.articlesRoute === true;
}
