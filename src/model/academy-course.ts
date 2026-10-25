import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

// MongoDB document for a Scro Academy course stored in `academy_courses`.
export type AcademyCourse = {
  _id: ObjectId;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

// Public DTO exposed to Academy pages and the admin CMS.
export type PublicAcademyCourse = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const academyCourseSchema: z.ZodType<AcademyCourse> = z.object({
  _id: objectIdSchema,
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  coverImage: z.string().optional(),
  published: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Input schema for creating a course from the admin CMS.
export const createAcademyCourseInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().optional(),
  excerpt: z.string().trim().optional(),
  content: z.string().trim().min(1, "Content is required"),
  coverImage: z.string().trim().optional(),
  published: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

// Input schema for updating an existing course from the admin CMS.
export const updateAcademyCourseInputSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").optional(),
  slug: z.string().trim().min(1, "Slug cannot be empty").optional(),
  excerpt: z.string().trim().optional(),
  content: z.string().trim().min(1, "Content cannot be empty").optional(),
  coverImage: z.string().trim().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
