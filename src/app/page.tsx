import type { Metadata } from "next";
import { PolicyLayout } from "@/presentation/components/legal/policy-layout";
import { getAuthSession } from "@/service/auth";
import { LandingCanvasShowcase } from "@/presentation/components/landing-canvas-showcase";
import { LandingCast } from "@/presentation/components/landing-cast";
import { LandingCatalog } from "@/presentation/components/landing-catalog";
import { LandingFreeCredit } from "@/presentation/components/landing-free-credit";
import { LandingHero } from "@/presentation/components/landing-hero";
import { LandingSteps } from "@/presentation/components/landing-steps";
import { StudioPowertoolsBand } from "@/presentation/components/studio-powertools-band";
import { PLANS } from "@/service/billing/plans";
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

// Canvas-First Homepage: canvas hero, 4-step idea-to-reel walkthrough, 3 steps, AI Characters, and Canvas studio engine.
export default async function HomePage() {
  const [session, locale] = await Promise.all([getAuthSession(), getRequestLocale()]);
  const messages = getMessages(locale);
  const siteUrl = getSiteUrl();
  const catalogStats = catalogShowcaseStats();
  const signedIn = Boolean(session);

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
        "@id": `${siteUrl}/#software`,
        name: "Scro Canvas",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: messages.meta.description,
        offers: {
          "@type": "AggregateOffer",
          lowPrice: String(PLANS.starter.amountUsd),
          highPrice: String(PLANS.scale.amountUsd),
          priceCurrency: "USD",
          offerCount: Object.keys(PLANS).length,
          url: `${siteUrl}/pricing`,
        },
        featureList: [
          "Scro Canvas Visual AI Workflow Studio with 6 One-Click Templates",
          "Free Canvas AI Assistant that builds workflows from natural language",
          "Up to 120s 1080p Lip-Sync Talking-Head Videos & 21-Language AI Voiceovers",
          "Whiteboard, Paper Cutout & 3D Papercraft Automated Explainer Videos",
          "Scro Swap Character & Outfit Replacement with 17 Cinematic Lighting Looks",
          "Scene Teleport: Keep Subject Motion & Voice While Relocating Backgrounds",
          "2K Posters, Lifestyle Photos & Consistent AI Character Identity Lock",
          "Automated Multi-Clip Merging, Voice Mixing, Trimming & Aspect Formatting",
        ],
      },
    ],
  };

  return (
    <PolicyLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHero signedIn={signedIn} />
      <LandingCanvasShowcase signedIn={signedIn} />
      <LandingSteps signedIn={signedIn} />
      <LandingCast />
      <LandingCatalog stats={catalogStats} signedIn={signedIn} />
      <StudioPowertoolsBand signedIn={signedIn} />
      <LandingFreeCredit signedIn={signedIn} />
    </PolicyLayout>
  );
}
