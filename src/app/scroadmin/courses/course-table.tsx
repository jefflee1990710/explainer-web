"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PublicAcademyCourse } from "@/model/academy-course";
import { deleteAcademyCourseAction } from "@/presentation/actions/academy";
import { useI18n } from "@/presentation/components/i18n-provider";

// Admin course list with edit / public view / delete.
export function CourseTable({ courses }: { courses: PublicAcademyCourse[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onDelete(course: PublicAcademyCourse) {
    if (!window.confirm(t("scroAdmin.confirmDelete"))) return;
    setPendingId(course.id);
    const result = await deleteAcademyCourseAction(course.id);
    setPendingId(null);
    if (result.ok) router.refresh();
    else window.alert(result.error === "forbidden" ? t("scroAdmin.errorForbidden") : t("scroAdmin.errorGeneric"));
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
        <p className="text-sm text-zinc-600">{t("scroAdmin.emptyCourses")}</p>
        <Link
          href="/scroadmin/courses/new"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#12141c] px-5 py-2 text-sm font-semibold text-[#c6f24b]"
        >
          {t("scroAdmin.newCourse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-3">{t("scroAdmin.titleLabel")}</th>
            <th className="px-4 py-3">{t("scroAdmin.publishedLabel")}</th>
            <th className="px-4 py-3">{t("scroAdmin.sortOrderLabel")}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {courses.map((course) => (
            <tr key={course.id} className="align-top">
              <td className="px-4 py-4">
                <Link
                  href={`/scroadmin/courses/${course.id}`}
                  className="font-semibold text-[#12141c] hover:underline"
                >
                  {course.title}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-500">/{course.slug}</p>
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    course.published
                      ? "bg-[#f4fcd4] text-[#12141c]"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {course.published ? t("scroAdmin.published") : t("scroAdmin.draft")}
                </span>
              </td>
              <td className="px-4 py-4 text-zinc-600">{course.sortOrder}</td>
              <td className="px-4 py-4 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <Link
                    href={`/scroadmin/courses/${course.id}`}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50"
                  >
                    {t("scroAdmin.editCourse")}
                  </Link>
                  {course.published ? (
                    <Link
                      href={`/academy/${encodeURIComponent(course.slug)}`}
                      className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50"
                    >
                      {t("scroAdmin.viewPublic")}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDelete(course)}
                    disabled={pendingId === course.id}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {pendingId === course.id ? t("scroAdmin.deleting") : t("scroAdmin.delete")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
