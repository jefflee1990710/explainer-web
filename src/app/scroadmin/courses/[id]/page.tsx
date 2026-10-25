import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getAcademyCourseBySlugOrId } from "@/service/academy/courses";
import { CourseEditor } from "@/app/scroadmin/courses/course-editor";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export const dynamic = "force-dynamic";

type EditCoursePageProps = {
  params: Promise<{ id: string }>;
};

// Edit an existing Academy course in markdown.
export default async function ScroAdminEditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params;
  const [course, jar] = await Promise.all([
    getAcademyCourseBySlugOrId(id, true),
    cookies(),
  ]);
  if (!course) notFound();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const copy = getMessages(locale).scroAdmin;

  return (
    <main>
      <h1 className="mb-6 font-display text-3xl font-bold">{copy.editCourse}</h1>
      <CourseEditor course={course} />
    </main>
  );
}
