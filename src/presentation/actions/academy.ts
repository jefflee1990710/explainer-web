"use server";

import { revalidatePath } from "next/cache";
import { resolveScroAdmin } from "@/service/academy/admin";
import {
  createAcademyCourse,
  deleteAcademyCourseBySlugOrId,
  updateAcademyCourseBySlugOrId,
} from "@/service/academy/courses";
import { uploadAcademyMedia } from "@/service/academy/media";

function revalidateAcademy(slug?: string) {
  revalidatePath("/academy");
  revalidatePath("/scroadmin");
  revalidatePath("/scroadmin/courses");
  if (slug) {
    revalidatePath(`/academy/${slug}`);
    revalidatePath(`/scroadmin/courses/${slug}`);
  }
}

export async function createAcademyCourseAction(input: {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  published?: boolean;
  sortOrder?: number;
}) {
  const admin = await resolveScroAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };
  const result = await createAcademyCourse(input);
  if (result.ok) revalidateAcademy(result.course.slug);
  return result;
}

export async function updateAcademyCourseAction(
  slugOrId: string,
  input: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
    published?: boolean;
    sortOrder?: number;
  },
) {
  const admin = await resolveScroAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };
  const result = await updateAcademyCourseBySlugOrId(slugOrId, input);
  if (result.ok) revalidateAcademy(result.course.slug);
  return result;
}

export async function deleteAcademyCourseAction(slugOrId: string) {
  const admin = await resolveScroAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };
  const result = await deleteAcademyCourseBySlugOrId(slugOrId);
  if (result.ok) revalidateAcademy(result.deletedSlug);
  return result;
}

export async function uploadAcademyMediaAction(formData: FormData) {
  const admin = await resolveScroAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Choose an image or video to upload" };
  }
  return uploadAcademyMedia(file);
}
