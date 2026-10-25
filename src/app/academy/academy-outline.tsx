import Link from "next/link";
import type { PublicAcademyCourse } from "@/model/academy-course";

function groupAcademyModules(courses: PublicAcademyCourse[]) {
  const modules: { name: string; courses: PublicAcademyCourse[] }[] = [];
  for (const course of courses) {
    const name = course.module?.trim() || "Lessons";
    const group = modules.find((item) => item.name === name);
    if (group) group.courses.push(course);
    else modules.push({ name, courses: [course] });
  }
  return modules;
}

// Sticky syllabus. Lesson bodies stay behind registration; the titles are public.
export function AcademyOutline({
  courses,
  heading,
  currentSlug,
}: {
  courses: PublicAcademyCourse[];
  heading: string;
  currentSlug?: string;
}) {
  const modules = groupAcademyModules(courses);

  return (
    <nav aria-label={heading} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{heading}</h2>
      <ol className="mt-4 space-y-5">
        {modules.map((group) => (
          <li key={group.name}>
            <p className="text-sm font-semibold text-[#12141c]">{group.name}</p>
            <ol className="mt-2 space-y-0.5">
              {group.courses.map((course) => {
                const current = currentSlug === course.slug;
                return (
                  <li key={course.id}>
                    <Link
                      href={`/academy/${encodeURIComponent(course.slug)}`}
                      aria-current={current ? "page" : undefined}
                      className={
                        current
                          ? "flex gap-2.5 rounded-xl bg-white px-2 py-1.5 text-sm font-semibold text-[#12141c] shadow-xs"
                          : "flex gap-2.5 rounded-xl px-2 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-white hover:text-[#12141c]"
                      }
                    >
                      <span className="w-6 shrink-0 font-semibold text-[#5c6170]">{course.sortOrder}</span>
                      <span>{course.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
