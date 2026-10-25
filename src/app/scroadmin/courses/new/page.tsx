import { cookies } from "next/headers";
import { CourseEditor } from "@/app/scroadmin/courses/course-editor";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export const dynamic = "force-dynamic";

// Blank markdown course form.
export default async function ScroAdminNewCoursePage() {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const copy = getMessages(locale).scroAdmin;

  return (
    <main>
      <h1 className="mb-6 font-display text-3xl font-bold">{copy.newCourse}</h1>
      <CourseEditor />
    </main>
  );
}
