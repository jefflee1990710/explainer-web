import Link from "next/link";
import { cookies } from "next/headers";
import { listAcademyCourses } from "@/service/academy/courses";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export const dynamic = "force-dynamic";

// Admin home: course count and a shortcut into the markdown CMS.
export default async function ScroAdminHomePage() {
  const [courses, jar] = await Promise.all([
    listAcademyCourses({ includeUnpublished: true }),
    cookies(),
  ]);
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const copy = getMessages(locale).scroAdmin;
  const published = courses.filter((course) => course.published).length;

  return (
    <main>
      <h1 className="font-display text-3xl font-bold">{copy.title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{copy.dashboardBody}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {copy.courses}
          </p>
          <p className="mt-2 font-display text-4xl font-bold">{courses.length}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {published} {copy.published.toLowerCase()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-[#12141c] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#c6f24b]">
            {copy.subtitle}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/scroadmin/analytics"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#c6f24b] px-5 py-2 text-sm font-semibold text-[#12141c]"
            >
              UX 路徑與流失分析
            </Link>
            <Link
              href="/scroadmin/analytics/directors"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white"
            >
              內建導演
            </Link>
            <Link
              href="/scroadmin/courses"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white"
            >
              {copy.openCourses}
            </Link>
            <Link
              href="/scroadmin/courses/new"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white"
            >
              {copy.newCourse}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
