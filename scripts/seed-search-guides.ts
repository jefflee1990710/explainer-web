import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

// Create or update the how-to search guides. Re-running does not fork a new slug.
async function main() {
  const { blogPostsCollection } = await import("@/dao/blog-posts");
  const { indexablePublishedFilter, isPartnerIntroPost } = await import(
    "@/service/blog-post/indexable"
  );
  const {
    createBlogPost,
    getPublishedBlogPostBySlug,
    updateBlogPostBySlugOrId,
  } = await import("@/service/blog-post/blog-posts");
  const { SEARCH_GUIDES, translationMap } = await import("@/service/blog-post/search-guides");

  for (const guide of SEARCH_GUIDES) {
    const payload = {
      title: guide.title,
      excerpt: guide.excerpt,
      content: guide.content,
      featureImage: guide.featureImage,
      tags: guide.tags,
      published: true as const,
      locale: guide.locale,
      translations: translationMap(guide),
      landingPath: guide.landingPath,
    };
    const existing = await getPublishedBlogPostBySlug(guide.slug, true);
    if (!existing) {
      const created = await createBlogPost({ slug: guide.slug, ...payload });
      if (!created.ok) throw new Error(`${guide.slug}: ${created.error}`);
      if (created.post.slug !== guide.slug) {
        throw new Error(`slug changed: wanted ${guide.slug}, got ${created.post.slug}`);
      }
      console.log("created", guide.slug);
      continue;
    }
    const owned =
      existing.tags.includes("Instagram Reels") || existing.title === guide.title;
    if (!owned) {
      throw new Error(`refusing to overwrite unrelated post ${guide.slug}`);
    }
    const updated = await updateBlogPostBySlugOrId(guide.slug, payload);
    if (!updated.ok) throw new Error(`${guide.slug}: ${updated.error}`);
    console.log("updated", guide.slug);
  }

  const slugs = SEARCH_GUIDES.map((guide) => guide.slug);
  const collection = await blogPostsCollection();
  const docs = await collection
    .find({ ...indexablePublishedFilter(), slug: { $in: slugs } })
    .project({ slug: 1, locale: 1, translations: 1, landingPath: 1, title: 1, tags: 1 })
    .toArray();
  if (docs.length !== SEARCH_GUIDES.length) {
    throw new Error(`indexable count ${docs.length}, expected ${SEARCH_GUIDES.length}`);
  }
  for (const doc of docs) {
    if (isPartnerIntroPost({ title: doc.title, tags: doc.tags })) {
      throw new Error(`partner filter hid ${doc.slug}`);
    }
    const guide = SEARCH_GUIDES.find((item) => item.slug === doc.slug);
    if (!guide) throw new Error(`unexpected slug ${doc.slug}`);
    if (doc.locale !== guide.locale) throw new Error(`${doc.slug} locale ${doc.locale}`);
    if (doc.landingPath !== guide.landingPath) {
      throw new Error(`${doc.slug} landing ${doc.landingPath}`);
    }
    const expected = translationMap(guide);
    for (const [locale, slug] of Object.entries(expected)) {
      const actual = doc.translations?.[locale as keyof typeof doc.translations];
      if (actual !== slug) throw new Error(`${doc.slug} translation ${locale} ${actual}`);
    }
  }
  console.log(`indexable ${docs.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
