import { ObjectId, type Filter } from "mongodb";
import { put } from "@vercel/blob";
import { blogPostsCollection } from "@/dao";
import {
  createBlogPostInputSchema,
  updateBlogPostInputSchema,
  type BlogPost,
  type PaginatedBlogPostsResult,
  type PublicBlogPost,
} from "@/model/blog-post";
import {
  getBundledBlogPostBySlug,
  listBundledBlogPosts,
  type BundledBlogPost,
} from "@/service/blog-post/bundled-posts";
import { derivePostExcerpt, slugifyBlogPost } from "@/service/blog-post/slug";

function bundledMatchesListFilter(
  post: BundledBlogPost,
  options: ListBlogPostsOptions,
): boolean {
  if (!options.includeUnpublished && !post.published) return false;
  if (options.tag?.trim()) {
    const tag = options.tag.trim();
    if (!post.tags.some((t) => t === tag)) return false;
  }
  if (options.q?.trim()) {
    const escaped = options.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const haystack = [post.title, post.excerpt, post.content, post.slug].join("\n");
    if (!regex.test(haystack)) return false;
  }
  return true;
}

// Convert a MongoDB BlogPost document into a serializable PublicBlogPost DTO.
export function toPublicBlogPost(doc: BlogPost): PublicBlogPost {
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt?.trim() || derivePostExcerpt(doc.content),
    content: doc.content,
    featureImage: doc.featureImage,
    tags: doc.tags ?? [],
    published: doc.published,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// Ensure slug uniqueness in `blog_posts` by appending -2, -3, etc. when needed.
async function ensureUniqueSlug(baseSlug: string, excludeId?: ObjectId): Promise<string> {
  const collection = await blogPostsCollection();
  let candidate = baseSlug;
  let counter = 2;
  while (
    await collection.findOne(
      excludeId ? { slug: candidate, _id: { $ne: excludeId } } : { slug: candidate },
      { projection: { _id: 1 } },
    )
  ) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return candidate;
}

// Upload a File to Vercel Blob if provided for featureImage.
export async function uploadBlogPostFeatureImage(file: File): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured for file upload");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`explainer/blog-posts/${Date.now()}-${safeName}`, file, {
    access: "public",
  });
  return blob.url;
}

export type CreateBlogPostParams = {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  featureImage: string;
  tags?: string[];
  published?: boolean;
};

// Validate and insert a new blog post into MongoDB.
export async function createBlogPost(
  raw: CreateBlogPostParams,
): Promise<{ ok: true; post: PublicBlogPost } | { ok: false; error: string }> {
  const parsed = createBlogPostInputSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message || "Invalid post payload" };
  }

  const data = parsed.data;
  const baseSlug = slugifyBlogPost(data.slug || data.title);
  const slug = await ensureUniqueSlug(baseSlug);
  const now = new Date();
  const doc: BlogPost = {
    _id: new ObjectId(),
    slug,
    title: data.title,
    excerpt: data.excerpt || derivePostExcerpt(data.content),
    content: data.content,
    featureImage: data.featureImage,
    tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
    published: data.published ?? true,
    createdAt: now,
    updatedAt: now,
  };

  const collection = await blogPostsCollection();
  await collection.insertOne(doc);
  return { ok: true, post: toPublicBlogPost(doc) };
}

export type ListBlogPostsOptions = {
  page?: number;
  limit?: number;
  tag?: string;
  q?: string;
  includeUnpublished?: boolean;
};

function paginatedBundledPostsOnly(options: ListBlogPostsOptions): PaginatedBlogPostsResult {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(options.limit) || 12)));
  const skip = (page - 1) * limit;
  const bundled = listBundledBlogPosts().filter((b) => bundledMatchesListFilter(b, options));
  const total = bundled.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    posts: bundled.slice(skip, skip + limit),
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// List blog posts with pagination, tag filtering, and search query.
export async function listBlogPostsPaginated(
  options: ListBlogPostsOptions = {},
): Promise<PaginatedBlogPostsResult> {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(options.limit) || 12)));
  const skip = (page - 1) * limit;

  const filter: Filter<BlogPost> = {};
  if (!options.includeUnpublished) {
    filter.published = true;
  }
  if (options.tag && options.tag.trim()) {
    filter.tags = options.tag.trim();
  }
  if (options.q && options.q.trim()) {
    const escaped = options.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [{ title: regex }, { excerpt: regex }, { content: regex }, { slug: regex }];
  }

  try {
    const collection = await blogPostsCollection();
    const [docs, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray() as Promise<BlogPost[]>,
      collection.countDocuments(filter),
    ]);

    let posts = docs.map(toPublicBlogPost);
    const mongoSlugs = new Set(posts.map((p) => p.slug));
    const bundledForList = listBundledBlogPosts().filter(
      (b) => bundledMatchesListFilter(b, options) && !mongoSlugs.has(b.slug),
    );
    const totalWithBundled = total + bundledForList.length;

    if (page === 1 && bundledForList.length > 0) {
      posts = [...bundledForList, ...posts].slice(0, limit);
    }

    const totalPages = Math.max(1, Math.ceil(totalWithBundled / limit));
    return {
      posts,
      page,
      limit,
      total: totalWithBundled,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  } catch (error) {
    if (options.includeUnpublished) throw error;
    console.error("[blog-posts] MongoDB unavailable; listing bundled posts only", error);
    return paginatedBundledPostsOnly(options);
  }
}

// List all published blog posts ordered from newest to oldest.
export async function listPublishedBlogPosts(limit = 100): Promise<PublicBlogPost[]> {
  const result = await listBlogPostsPaginated({ page: 1, limit });
  return result.posts;
}

// Resolve a blog post by either its SEO slug or 24-hex ObjectId.
async function findBlogPostDoc(
  slugOrId: string,
  includeUnpublished = false,
): Promise<BlogPost | null> {
  const normalized = decodeURIComponent(slugOrId).trim();
  if (!normalized) return null;
  const collection = await blogPostsCollection();
  const pubFilter = includeUnpublished ? {} : { published: true };

  const bySlug = (await collection.findOne({
    slug: normalized,
    ...pubFilter,
  })) as BlogPost | null;
  if (bySlug) return bySlug;

  if (ObjectId.isValid(normalized) && normalized.length === 24) {
    return (await collection.findOne({
      _id: new ObjectId(normalized),
      ...pubFilter,
    })) as BlogPost | null;
  }
  return null;
}

// Find a single published blog post by its SEO slug (or ID).
export async function getPublishedBlogPostBySlug(
  slug: string,
  includeUnpublished = false,
): Promise<PublicBlogPost | null> {
  let doc: BlogPost | null = null;
  try {
    doc = await findBlogPostDoc(slug, includeUnpublished);
  } catch (error) {
    if (includeUnpublished) throw error;
    console.error("[blog-posts] MongoDB unavailable; resolving bundled post fallback", error);
  }
  if (doc) return toPublicBlogPost(doc);

  const normalized = decodeURIComponent(slug).trim();
  const bundled = normalized ? getBundledBlogPostBySlug(normalized) : null;
  if (!bundled) return null;
  if (!includeUnpublished && !bundled.published) return null;
  return bundled;
}

export type UpdateBlogPostParams = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featureImage?: string;
  tags?: string[];
  published?: boolean;
};

// Update an existing blog post by slug or ID.
export async function updateBlogPostBySlugOrId(
  slugOrId: string,
  raw: UpdateBlogPostParams,
): Promise<{ ok: true; post: PublicBlogPost } | { ok: false; error: string; notFound?: boolean }> {
  const existing = await findBlogPostDoc(slugOrId, true);
  if (!existing) {
    return { ok: false, error: "Post not found", notFound: true };
  }

  const parsed = updateBlogPostInputSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue?.message || "Invalid update payload" };
  }

  const data = parsed.data;
  const nextTitle = data.title ?? existing.title;
  const nextContent = data.content ?? existing.content;
  let nextSlug = existing.slug;
  if (data.slug !== undefined) {
    nextSlug = await ensureUniqueSlug(slugifyBlogPost(data.slug), existing._id);
  }

  const nextExcerpt =
    data.excerpt !== undefined
      ? data.excerpt || derivePostExcerpt(nextContent)
      : data.content !== undefined && !existing.excerpt
        ? derivePostExcerpt(nextContent)
        : existing.excerpt;

  const updatedDoc: BlogPost = {
    ...existing,
    slug: nextSlug,
    title: nextTitle,
    excerpt: nextExcerpt,
    content: nextContent,
    featureImage: data.featureImage ?? existing.featureImage,
    tags: data.tags !== undefined ? data.tags : existing.tags,
    published: data.published ?? existing.published,
    updatedAt: new Date(),
  };

  const collection = await blogPostsCollection();
  await collection.updateOne(
    { _id: existing._id },
    {
      $set: {
        slug: updatedDoc.slug,
        title: updatedDoc.title,
        excerpt: updatedDoc.excerpt,
        content: updatedDoc.content,
        featureImage: updatedDoc.featureImage,
        tags: updatedDoc.tags,
        published: updatedDoc.published,
        updatedAt: updatedDoc.updatedAt,
      },
    },
  );

  return { ok: true, post: toPublicBlogPost(updatedDoc) };
}

// Delete an existing blog post by slug or ID.
export async function deleteBlogPostBySlugOrId(
  slugOrId: string,
): Promise<{ ok: true; deletedSlug: string } | { ok: false; error: string; notFound?: boolean }> {
  const existing = await findBlogPostDoc(slugOrId, true);
  if (!existing) {
    return { ok: false, error: "Post not found", notFound: true };
  }
  const collection = await blogPostsCollection();
  await collection.deleteOne({ _id: existing._id });
  return { ok: true, deletedSlug: existing.slug };
}
