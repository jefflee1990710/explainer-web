import Link from "next/link";
import type { PublicAcademyCourse } from "@/model/academy-course";

// Numbered syllabus. Lesson bodies stay behind registration; the titles are public.
export function AcademyOutline({
  courses,
  heading,
}: {
  courses: PublicAcademyCourse[];
  heading: string;
}) {
  const modules: { name: string; courses: PublicAcademyCourse[] }[] = [];
  for (const course of courses) {
    const name = course.module?.trim() || "Lessons";
    const group = modules.find((item) => item.name === name);
    if (group) group.courses.push(course);
    else modules.push({ name, courses: [course] });
  }

  return (
    <nav aria-label={heading} className="mb-14 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{heading}</h2>
      <ol className="mt-4 space-y-6">
        {modules.map((group) => (
          <li key={group.name}>
            <p className="text-sm font-semibold text-[#12141c]">{group.name}</p>
            <ol className="mt-2 space-y-1.5">
              {group.courses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/academy/${encodeURIComponent(course.slug)}`}
                    className="flex gap-3 rounded-xl px-2 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-white hover:text-[#12141c]"
                  >
                    <span className="w-6 shrink-0 font-semibold text-[#5c6170]">{course.sortOrder}</span>
                    <span>{course.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
