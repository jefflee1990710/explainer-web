import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { MarkdownContent } from "@/presentation/components/markdown-content";
import { getAuthSession } from "@/service/auth";
import {
  getAcademyCourseBySlugOrId,
  getPublishedAcademySummary,
  listPublishedAcademySummaries,
} from "@/service/academy/courses";
import { AcademyCourseLock } from "@/app/academy/[slug]/academy-course-lock";
import { AcademyLessonVideo } from "@/app/academy/[slug]/academy-lesson-video";
import { AcademyOutline } from "@/app/academy/academy-outline";
import { AcademyShell } from "@/app/academy/academy-shell";
import { liftAcademyLessonVideo } from "@/service/academy/lift-video";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export const dynamic = "force-dynamic";

type AcademyCoursePageProps = {
  params: Promise<{ slug: string }>;
};

async function getAcademyCopy() {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  return { locale, copy: getMessages(locale).academyPage };
}

export async function generateMetadata({ params }: AcademyCoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const [summary, { copy }] = await Promise.all([
    getPublishedAcademySummary(slug),
    getAcademyCopy(),
  ]);
  if (!summary) {
    return { title: copy.notFoundTitle };
  }
  const canonicalPath = `/academy/${encodeURIComponent(summary.slug)}`;
  return {
    title: `${summary.title} | Scro Academy`,
    description: summary.excerpt,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: summary.title,
      description: summary.excerpt,
      type: "article",
      url: canonicalPath,
      images: summary.coverImage ? [{ url: summary.coverImage, alt: summary.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: summary.title,
      description: summary.excerpt,
      images: summary.coverImage ? [summary.coverImage] : undefined,
    },
  };
}

// Lesson page: catalog metadata is public; the markdown body requires a Scro login.
export default async function AcademyCoursePage({ params }: AcademyCoursePageProps) {
  const { slug } = await params;
  const [{ copy }, session, courses] = await Promise.all([
    getAcademyCopy(),
    getAuthSession(),
    listPublishedAcademySummaries(),
  ]);
  const signedIn = Boolean(session);
  const course = signedIn
    ? await getAcademyCourseBySlugOrId(slug)
    : await getPublishedAcademySummary(slug);
  if (!course) notFound();

  const lifted = signedIn ? liftAcademyLessonVideo(course.content) : null;

  return (
    <PolicyLayout>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <AcademyShell
          aside={
            <AcademyOutline
              courses={courses}
              heading={copy.contents}
              currentSlug={course.slug}
            />
          }
        >
          <Link
            href="/academy"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-[#12141c]"
          >
            {copy.backToAcademy}
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {course.title}
          </h1>
          {course.excerpt ? (
            <p className="mt-3 text-base leading-7 text-zinc-600">{course.excerpt}</p>
          ) : null}
          {lifted?.src ? (
            <AcademyLessonVideo src={lifted.src} title={course.title} />
          ) : course.coverImage ? (
            <img
              src={course.coverImage}
              alt={course.title}
              className="mt-8 w-full rounded-2xl border border-zinc-200 object-cover"
            />
          ) : null}
          {signedIn ? (
            <div className="mt-8">
              <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-[#5c6170]">
                {copy.memberHint}
              </p>
              <MarkdownContent content={lifted?.body ?? course.content} />
            </div>
          ) : (
            <AcademyCourseLock course={course} />
          )}
        </AcademyShell>
      </main>
    </PolicyLayout>
  );
}
