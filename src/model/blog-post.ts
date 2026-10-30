import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export const BLOG_LOCALES = ["en", "zh-Hant", "zh-Hans"] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];

// MongoDB document for a public SEO blog post stored in `blog_posts`.
export type BlogPost = {
  _id: ObjectId;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featureImage: string;
  tags?: string[];
  published: boolean;
  // Missing documents are English. Translations are sibling slugs, not ?hl= copies.
  locale?: BlogLocale;
  translations?: Partial<Record<BlogLocale, string>>;
  // Internal product page this article should send readers to.
  landingPath?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Public DTO exposed to pages and REST API responses.
export type PublicBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featureImage: string;
  tags: string[];
  published: boolean;
  locale: BlogLocale;
  translations?: Partial<Record<BlogLocale, string>>;
  landingPath?: string;
  createdAt: string;
  updatedAt: string;
};

// Paginated response envelope for listing blog posts.
export type PaginatedBlogPostsResult = {
  posts: PublicBlogPost[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

const blogLocaleSchema = z.enum(BLOG_LOCALES);

const blogTranslationsSchema = z.object({
  en: z.string().trim().min(1).optional(),
  "zh-Hant": z.string().trim().min(1).optional(),
  "zh-Hans": z.string().trim().min(1).optional(),
});

// A product link stays on this site. Open redirects are rejected.
const landingPathSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("://") && !value.includes("\\"),
    "Landing path must be a site path",
  );

export const blogPostSchema: z.ZodType<BlogPost> = z.object({
  _id: objectIdSchema,
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  featureImage: z.string().min(1),
  tags: z.array(z.string()).optional(),
  published: z.boolean(),
  locale: blogLocaleSchema.optional(),
  translations: blogTranslationsSchema.optional(),
  landingPath: landingPathSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Input schema for creating a blog post via API.
export const createBlogPostInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().optional(),
  excerpt: z.string().trim().optional(),
  content: z.string().trim().min(1, "Content is required"),
  featureImage: z.string().trim().min(1, "Feature image is required"),
  tags: z.array(z.string().trim().min(1)).optional(),
  published: z.boolean().optional().default(true),
  locale: blogLocaleSchema.optional(),
  translations: blogTranslationsSchema.optional(),
  landingPath: landingPathSchema.optional(),
});

// Input schema for updating an existing blog post via API.
export const updateBlogPostInputSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").optional(),
  slug: z.string().trim().min(1, "Slug cannot be empty").optional(),
  excerpt: z.string().trim().optional(),
  content: z.string().trim().min(1, "Content cannot be empty").optional(),
  featureImage: z.string().trim().min(1, "Feature image cannot be empty").optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  published: z.boolean().optional(),
  locale: blogLocaleSchema.optional(),
  translations: blogTranslationsSchema.optional(),
  landingPath: landingPathSchema.optional(),
});
