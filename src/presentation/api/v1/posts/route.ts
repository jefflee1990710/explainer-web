import { apiError, apiJson, readJson } from "@/service/api/respond";
import { isAuthorizedPostAdmin, parsePostTags } from "@/service/blog-post/api-auth";
import type { BlogLocale } from "@/model/blog-post";
import {
  createBlogPost,
  listBlogPostsPaginated,
  uploadBlogPostFeatureImage,
} from "@/service/blog-post/blog-posts";
import { isBlogLocale } from "@/service/blog-post/translations";

// GET /api/v1/posts — paginated list of blog posts (`?page=1&limit=12&tag=...&q=...&includeUnpublished=true`).
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "12");
    const tag = url.searchParams.get("tag") || undefined;
    const q = url.searchParams.get("q") || undefined;
    const wantsUnpublished = url.searchParams.get("includeUnpublished") === "true";

    const includeUnpublished = wantsUnpublished ? await isAuthorizedPostAdmin(request) : false;
    const result = await listBlogPostsPaginated({
      page,
      limit,
      tag,
      q,
      includeUnpublished,
    });
    return apiJson(result);
  } catch (error) {
    console.error("[api/v1/posts] GET", error);
    return apiError(error instanceof Error ? error.message : "Failed to load posts", 500);
  }
}

// POST /api/v1/posts — create a new blog post via JSON or multipart/form-data.
export async function POST(request: Request) {
  try {
    const authorized = await isAuthorizedPostAdmin(request);
    if (!authorized) {
      return apiError("Unauthorized: valid x-api-key or Bearer token required", 401);
    }

    const contentType = request.headers.get("content-type") || "";
    let title = "";
    let slug: string | undefined;
    let excerpt: string | undefined;
    let content = "";
    let featureImage = "";
    let tags: string[] | undefined;
    let published = true;
    let locale: BlogLocale | undefined;
    let translations: Partial<Record<BlogLocale, string>> | undefined;
    let landingPath: string | undefined;

    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const form = await request.formData();
      title = String(form.get("title") ?? "").trim();
      const rawSlug = form.get("slug");
      slug = typeof rawSlug === "string" && rawSlug.trim() ? rawSlug.trim() : undefined;
      const rawExcerpt = form.get("excerpt");
      excerpt = typeof rawExcerpt === "string" && rawExcerpt.trim() ? rawExcerpt.trim() : undefined;
      content = String(form.get("content") ?? "").trim();
      tags = parsePostTags(
        form.getAll("tags").length > 1 ? form.getAll("tags") : form.get("tags"),
      );

      const rawPublished = form.get("published");
      if (typeof rawPublished === "string" && rawPublished.trim() !== "") {
        published = rawPublished !== "false" && rawPublished !== "0";
      }
      const rawLocale = form.get("locale");
      if (typeof rawLocale === "string" && isBlogLocale(rawLocale.trim())) {
        locale = rawLocale.trim() as BlogLocale;
      }
      const rawLanding = form.get("landingPath");
      if (typeof rawLanding === "string" && rawLanding.trim()) landingPath = rawLanding.trim();
      const rawTranslations = form.get("translations");
      if (typeof rawTranslations === "string" && rawTranslations.trim()) {
        try {
          const parsed = JSON.parse(rawTranslations) as Partial<Record<BlogLocale, string>>;
          if (parsed && typeof parsed === "object") translations = parsed;
        } catch {
          translations = undefined;
        }
      }

      const imageEntry = form.get("featureImage") ?? form.get("file");
      if (imageEntry instanceof File && imageEntry.size > 0) {
        featureImage = await uploadBlogPostFeatureImage(imageEntry);
      } else if (typeof imageEntry === "string") {
        featureImage = imageEntry.trim();
      }
    } else {
      const body = await readJson<Record<string, unknown>>(request);
      title = typeof body.title === "string" ? body.title.trim() : "";
      slug = typeof body.slug === "string" && body.slug.trim() ? body.slug.trim() : undefined;
      excerpt =
        typeof body.excerpt === "string" && body.excerpt.trim() ? body.excerpt.trim() : undefined;
      content = typeof body.content === "string" ? body.content.trim() : "";
      featureImage =
        typeof body.featureImage === "string"
          ? body.featureImage.trim()
          : typeof body.featureImageUrl === "string"
            ? body.featureImageUrl.trim()
            : "";
      tags = parsePostTags(body.tags);
      if (typeof body.published === "boolean") {
        published = body.published;
      }
      if (typeof body.locale === "string" && isBlogLocale(body.locale)) locale = body.locale;
      if (typeof body.landingPath === "string") landingPath = body.landingPath.trim();
      if (body.translations && typeof body.translations === "object") {
        translations = body.translations as Partial<Record<BlogLocale, string>>;
      }
    }

    const result = await createBlogPost({
      title,
      slug,
      excerpt,
      content,
      featureImage,
      tags,
      published,
      locale,
      translations,
      landingPath,
    });

    if (!result.ok) {
      return apiError(result.error, 400);
    }

    return apiJson({ post: result.post }, 201);
  } catch (error) {
    console.error("[api/v1/posts] POST", error);
    return apiError(error instanceof Error ? error.message : "Failed to create post", 500);
  }
}
