import type { PublicAcademyCourse } from "@/model/academy-course";
import { AcademyCourseCard } from "@/app/academy/academy-course-card";

// Responsive catalog of published Academy courses.
export function AcademyCourseGrid({ courses }: { courses: PublicAcademyCourse[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <AcademyCourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
