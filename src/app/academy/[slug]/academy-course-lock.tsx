"use client";

import Link from "next/link";
import type { PublicAcademyCourse } from "@/model/academy-course";
import { useI18n } from "@/presentation/components/i18n-provider";

// Signed-out gate: show the excerpt and send the visitor to register for the full lesson.
export function AcademyCourseLock({
  course,
}: {
  course: Pick<PublicAcademyCourse, "title" | "excerpt" | "slug">;
}) {
  const { t } = useI18n();

  return (
    <aside className="mt-8 overflow-hidden rounded-2xl border border-[#12141c]/15 bg-gradient-to-br from-[#12141c] via-[#181b26] to-[#12141c] p-6 text-white sm:p-8">
      <p className="inline-flex items-center rounded-full border border-[#c6f24b]/40 bg-[#c6f24b]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#c6f24b]">
        {t("academyPage.freeForMembers")}
      </p>
      <h2 className="mt-4 font-display text-2xl font-bold leading-snug text-white">
        {t("academyPage.lockTitle")}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
        {t("academyPage.lockBody")}
      </p>
      {course.excerpt ? (
        <p className="mt-4 max-w-xl border-l-2 border-[#c6f24b]/50 pl-4 text-sm text-white/80">
          {course.excerpt}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/sign-up?next=/academy/${encodeURIComponent(course.slug)}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#c6f24b] px-6 py-2.5 text-sm font-bold text-[#12141c] transition hover:bg-[#d4f76e]"
        >
          {t("academyPage.lockCta")}
        </Link>
        <Link
          href={`/sign-in?next=/academy/${encodeURIComponent(course.slug)}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {t("academyPage.lockSignIn")}
        </Link>
      </div>
    </aside>
  );
}
