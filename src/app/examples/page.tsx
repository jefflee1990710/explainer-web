import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ExamplesView } from "@/presentation/components/examples-view";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const ex = getMessages(locale).examples;
  const title = `Scro — ${ex.heroTitle}`;
  const description = ex.subtitle;
  return {
    title,
    description,
    alternates: {
      canonical: "/examples",
    },
    openGraph: {
      title,
      description,
      url: "/examples",
      siteName: "Scro",
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ExamplesPage() {
  const session = await getAuthSession();
  return (
    <PolicyLayout>
      <ExamplesView signedIn={Boolean(session)} />
    </PolicyLayout>
  );
}
