import Link from "next/link";
import { cookies } from "next/headers";
import { listAcademyCourses } from "@/service/academy/courses";
import { CourseTable } from "@/app/scroadmin/courses/course-table";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export const dynamic = "force-dynamic";

// Operator course catalog for the markdown CMS.
export default async function ScroAdminCoursesPage() {
  const [courses, jar] = await Promise.all([
    listAcademyCourses({ includeUnpublished: true }),
    cookies(),
  ]);
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const copy = getMessages(locale).scroAdmin;

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{copy.courses}</h1>
          <p className="mt-2 text-sm text-zinc-600">{copy.courseCount.replace("{count}", String(courses.length))}</p>
        </div>
        <Link
          href="/scroadmin/courses/new"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#12141c] px-5 py-2 text-sm font-semibold text-[#c6f24b]"
        >
          {copy.newCourse}
        </Link>
      </div>
      <CourseTable courses={courses} />
    </main>
  );
}
