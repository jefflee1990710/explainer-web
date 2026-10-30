import { apiError, apiJson, readJson } from "@/service/api/respond";
import { isAuthorizedPostAdmin, parsePostTags } from "@/service/blog-post/api-auth";
import type { BlogLocale } from "@/model/blog-post";
import {
  deleteBlogPostBySlugOrId,
  getPublishedBlogPostBySlug,
  updateBlogPostBySlugOrId,
  uploadBlogPostFeatureImage,
  type UpdateBlogPostParams,
} from "@/service/blog-post/blog-posts";
import { isBlogLocale } from "@/service/blog-post/translations";

// GET /api/v1/posts/[slug] — fetch a single blog post by its SEO slug or ID.
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const includeUnpublished = await isAuthorizedPostAdmin(request);
    const post = await getPublishedBlogPostBySlug(slug, includeUnpublished);
    if (!post) {
      return apiError("Post not found", 404);
    }
    return apiJson({ post });
  } catch (error) {
    console.error("[api/v1/posts/[slug]] GET", error);
    return apiError(error instanceof Error ? error.message : "Failed to load post", 500);
  }
}

// Parse update payload from either JSON or multipart/form-data.
async function parseUpdatePayload(request: Request): Promise<UpdateBlogPostParams> {
  const contentType = request.headers.get("content-type") || "";
  const updates: UpdateBlogPostParams = {};

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const form = await request.formData();
    if (form.has("title")) updates.title = String(form.get("title") ?? "").trim();
    if (form.has("slug")) updates.slug = String(form.get("slug") ?? "").trim();
    if (form.has("excerpt")) updates.excerpt = String(form.get("excerpt") ?? "").trim();
    if (form.has("content")) updates.content = String(form.get("content") ?? "").trim();
    if (form.has("tags")) {
      updates.tags = parsePostTags(
        form.getAll("tags").length > 1 ? form.getAll("tags") : form.get("tags"),
      );
    }
    if (form.has("published")) {
      const rawPublished = String(form.get("published") ?? "").trim();
      updates.published = rawPublished !== "false" && rawPublished !== "0";
    }
    if (form.has("locale")) {
      const rawLocale = String(form.get("locale") ?? "").trim();
      if (isBlogLocale(rawLocale)) updates.locale = rawLocale;
    }
    if (form.has("landingPath")) updates.landingPath = String(form.get("landingPath") ?? "").trim();
    if (form.has("translations")) {
      try {
        const parsed = JSON.parse(String(form.get("translations") ?? "")) as Partial<Record<BlogLocale, string>>;
        if (parsed && typeof parsed === "object") updates.translations = parsed;
      } catch {
        updates.translations = undefined;
      }
    }
    const imageEntry = form.get("featureImage") ?? form.get("file");
    if (imageEntry instanceof File && imageEntry.size > 0) {
      updates.featureImage = await uploadBlogPostFeatureImage(imageEntry);
    } else if (typeof imageEntry === "string" && imageEntry.trim()) {
      updates.featureImage = imageEntry.trim();
    }
    return updates;
  }

  const body = await readJson<Record<string, unknown>>(request);
  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.slug === "string") updates.slug = body.slug.trim();
  if (typeof body.excerpt === "string") updates.excerpt = body.excerpt.trim();
  if (typeof body.content === "string") updates.content = body.content.trim();
  if (typeof body.featureImage === "string") {
    updates.featureImage = body.featureImage.trim();
  } else if (typeof body.featureImageUrl === "string") {
    updates.featureImage = body.featureImageUrl.trim();
  }
  if (body.tags !== undefined) {
    updates.tags = parsePostTags(body.tags);
  }
  if (typeof body.published === "boolean") {
    updates.published = body.published;
  }
  if (typeof body.locale === "string" && isBlogLocale(body.locale)) updates.locale = body.locale;
  if (typeof body.landingPath === "string") updates.landingPath = body.landingPath.trim();
  if (body.translations && typeof body.translations === "object") {
    updates.translations = body.translations as Partial<Record<BlogLocale, string>>;
  }
  return updates;
}

// PATCH /api/v1/posts/[slug] — edit an existing blog post by slug or ID.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const authorized = await isAuthorizedPostAdmin(request);
    if (!authorized) {
      return apiError("Unauthorized: valid x-api-key or Bearer token required", 401);
    }
    const { slug } = await context.params;
    const updates = await parseUpdatePayload(request);
    const result = await updateBlogPostBySlugOrId(slug, updates);
    if (!result.ok) {
      return apiError(result.error, result.notFound ? 404 : 400);
    }
    return apiJson({ post: result.post });
  } catch (error) {
    console.error("[api/v1/posts/[slug]] PATCH", error);
    return apiError(error instanceof Error ? error.message : "Failed to update post", 500);
  }
}

// PUT /api/v1/posts/[slug] — alias to PATCH for editing a blog post.
export const PUT = PATCH;

// DELETE /api/v1/posts/[slug] — delete an existing blog post by slug or ID.
export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const authorized = await isAuthorizedPostAdmin(request);
    if (!authorized) {
      return apiError("Unauthorized: valid x-api-key or Bearer token required", 401);
    }
    const { slug } = await context.params;
    const result = await deleteBlogPostBySlugOrId(slug);
    if (!result.ok) {
      return apiError(result.error, result.notFound ? 404 : 400);
    }
    return apiJson({ ok: true, deletedSlug: result.deletedSlug });
  } catch (error) {
    console.error("[api/v1/posts/[slug]] DELETE", error);
    return apiError(error instanceof Error ? error.message : "Failed to delete post", 500);
  }
}
