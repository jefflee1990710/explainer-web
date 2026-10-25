import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { LandingCast } from "@/presentation/components/landing-cast";
import { LandingCatalog } from "@/presentation/components/landing-catalog";
import { LandingFreeCredit } from "@/presentation/components/landing-free-credit";
import { LandingAcademy } from "@/presentation/components/landing-academy";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingDirector } from "@/presentation/components/landing-director";
import { LandingIp } from "@/presentation/components/landing-ip";
import { LandingKol } from "@/presentation/components/landing-kol";
import { LandingSteps } from "@/presentation/components/landing-steps";
import { LandingUseCases } from "@/presentation/components/landing-use-cases";
import { StudioPowertoolsBand } from "@/presentation/components/studio-powertools-band";
import { catalogShowcaseStats } from "@/service/character/catalog-stats";
import { getSiteUrl } from "@/util/app-url";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY } from "@/util/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const messages = getMessages(locale);
  return {
    title: messages.meta.title,
    description: messages.meta.description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: messages.meta.title,
      description: messages.meta.description,
      url: "/",
      siteName: "Scro",
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: messages.meta.title,
      description: messages.meta.description,
    },
  };
}

// Plans live on /pricing. Landing leads with soul injection, then Scro Academy, identity lock, brand IP, catalog, use cases, steps, studio powertools, cost control, and free credits.
export default async function HomePage() {
  const [session, jar] = await Promise.all([getAuthSession(), cookies()]);
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  const locale = isLocaleId(stored) ? stored : DEFAULT_LOCALE;
  const messages = getMessages(locale);
  const siteUrl = getSiteUrl();
  const catalogStats = catalogShowcaseStats();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Scro",
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
        contactPoint: [
          {
            "@type": "ContactPoint",
            email: "cs@thenovax.com",
            contactType: "customer support",
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Scro",
        description: messages.meta.description,
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Scro",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: messages.meta.description,
      },
    ],
  };

  return (
    <PolicyLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHero signedIn={Boolean(session)} />
      <LandingAcademy signedIn={Boolean(session)} />
      <LandingCast />
      <LandingIp />
      <LandingCatalog stats={catalogStats} signedIn={Boolean(session)} />
      <LandingKol />
      <LandingUseCases signedIn={Boolean(session)} />
      <LandingSteps signedIn={Boolean(session)} />
      <StudioPowertoolsBand signedIn={Boolean(session)} />
      <LandingDirector />
      <LandingFreeCredit signedIn={Boolean(session)} />
    </PolicyLayout>
  );
}
