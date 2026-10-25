"use client";

import Link from "next/link";
import type { PublicAcademyCourse } from "@/model/academy-course";
import { useI18n } from "@/presentation/components/i18n-provider";

// One published course card on the public Academy catalog.
export function AcademyCourseCard({ course }: { course: PublicAcademyCourse }) {
  const { t } = useI18n();

  return (
    <Link
      href={`/academy/${encodeURIComponent(course.slug)}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-16/10 w-full overflow-hidden bg-[#12141c]">
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between p-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c6f24b]">
              {t("nav.academy")}
            </span>
            <p className="font-display text-xl font-bold leading-snug text-white">{course.title}</p>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5c6170]">
            {t("academyPage.freeForMembers")}
          </p>
          <h2 className="mt-1.5 line-clamp-2 text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-700">
            {course.title}
          </h2>
          {course.excerpt ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600">
              {course.excerpt}
            </p>
          ) : null}
        </div>
        <span className="mt-4 inline-flex items-center text-sm font-medium text-zinc-900">
          {t("academyPage.openCourse")}
        </span>
      </div>
    </Link>
  );
}
