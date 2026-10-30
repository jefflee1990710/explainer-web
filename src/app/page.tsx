import type { Metadata } from "next";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { LandingCast } from "@/presentation/components/landing-cast";
import { LandingCatalog } from "@/presentation/components/landing-catalog";
import { LandingFreeCredit } from "@/presentation/components/landing-free-credit";
import { LandingExplainerReel } from "@/presentation/components/landing-explainer-reel";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingDirector } from "@/presentation/components/landing-director";
import { LandingIp } from "@/presentation/components/landing-ip";
import { LandingKol } from "@/presentation/components/landing-kol";
import { LandingSteps } from "@/presentation/components/landing-steps";
import { LandingUseCases } from "@/presentation/components/landing-use-cases";
import { StudioPowertoolsBand } from "@/presentation/components/studio-powertools-band";
import { catalogShowcaseStats } from "@/service/character/catalog-stats";
import { getSiteUrl } from "@/util/app-url";
import { getMessages } from "@/util/i18n";
import { getRequestLocale } from "@/util/i18n/request-locale";
import { publicPageMetadata } from "@/util/seo/public-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return publicPageMetadata({
    title: messages.meta.title,
    description: messages.meta.description,
    path: "/",
    locale,
  });
}

// Plans live on /pricing. Landing leads with explainer videos and the AI Influencer who hosts them.
export default async function HomePage() {
  const [session, locale] = await Promise.all([getAuthSession(), getRequestLocale()]);
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
      <LandingExplainerReel signedIn={Boolean(session)} />
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
