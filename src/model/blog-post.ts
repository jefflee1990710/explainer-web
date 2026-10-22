import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

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

export const blogPostSchema: z.ZodType<BlogPost> = z.object({
  _id: objectIdSchema,
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  featureImage: z.string().min(1),
  tags: z.array(z.string()).optional(),
  published: z.boolean(),
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
});
