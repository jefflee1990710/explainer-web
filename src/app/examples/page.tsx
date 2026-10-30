import type { Metadata } from "next";
import { ExamplesView } from "@/presentation/components/examples-view";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { PublicPageJsonLd } from "@/presentation/components/seo/public-page-json-ld";
import { getAuthSession } from "@/service/auth";
import { getMessages } from "@/util/i18n";
import { getRequestLocale } from "@/util/i18n/request-locale";
import { publicPageMetadata } from "@/util/seo/public-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const ex = getMessages(locale).examples;
  const title = ex.seoTitle || `Scro — ${ex.heroTitle}`;
  const description = ex.seoDescription || ex.subtitle;
  return publicPageMetadata({ title, description, path: "/examples", locale });
}

export default async function ExamplesPage() {
  const [session, locale] = await Promise.all([getAuthSession(), getRequestLocale()]);
  const ex = getMessages(locale).examples;
  return (
    <PolicyLayout>
      <PublicPageJsonLd
        path="/examples"
        title={ex.seoTitle || `Scro — ${ex.heroTitle}`}
        description={ex.seoDescription || ex.subtitle}
      />
      <ExamplesView signedIn={Boolean(session)} />
    </PolicyLayout>
  );
}
