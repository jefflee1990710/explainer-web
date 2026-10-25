import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { listPublishedAcademySummaries } from "@/service/academy/courses";
import { AcademyCourseGrid } from "@/app/academy/academy-course-grid";
import { AcademyOutline } from "@/app/academy/academy-outline";
import { AcademyShell } from "@/app/academy/academy-shell";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export const dynamic = "force-dynamic";

async function getAcademyCopy() {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  return { locale, copy: getMessages(locale).academyPage };
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, copy } = await getAcademyCopy();
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    alternates: {
      canonical: "/academy",
    },
    openGraph: {
      title: copy.seoTitle,
      description: copy.seoDescription,
      url: "/academy",
      siteName: "Scro",
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: copy.seoTitle,
      description: copy.seoDescription,
    },
  };
}

// Public Scro Academy catalog. Lesson bodies stay locked until the visitor registers.
export default async function AcademyPage() {
  const [{ copy }, courses] = await Promise.all([
    getAcademyCopy(),
    listPublishedAcademySummaries(),
  ]);

  return (
    <PolicyLayout>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {courses.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-zinc-900">{copy.emptyTitle}</h2>
            <p className="mt-2 text-sm text-zinc-600">{copy.emptyBody}</p>
          </div>
        ) : (
          <AcademyShell aside={<AcademyOutline courses={courses} heading={copy.contents} />}>
            <header className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                {copy.eyebrow}
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-3 text-base text-zinc-600">{copy.subtitle}</p>
            </header>
            <AcademyCourseGrid courses={courses} />
          </AcademyShell>
        )}
      </main>
    </PolicyLayout>
  );
}
