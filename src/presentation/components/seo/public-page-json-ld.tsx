import { PLANS } from "@/service/billing/plans";
import { getSiteUrl } from "@/util/app-url";
import { getMessages } from "@/util/i18n";
import { getRequestLocale } from "@/util/i18n/request-locale";
import { KEY_TO_PATH, type MarketingPageKey } from "@/util/i18n/marketing-seo-paths";

type PublicPageJsonLdProps = {
  path: string;
  title: string;
  description: string;
  includeSoftwareOffer?: boolean;
};

// WebPage + breadcrumb graph (plus optional SoftwareApplication Offer) for a public marketing or listing URL.
export function PublicPageJsonLd({
  path,
  title,
  description,
  includeSoftwareOffer = false,
}: PublicPageJsonLdProps) {
  const siteUrl = getSiteUrl();
  const pageUrl = path === "/" ? siteUrl : `${siteUrl}${path}`;
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Scro",
      url: siteUrl,
      logo: `${siteUrl}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Scro",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      isPartOf: { "@id": `${siteUrl}/#website` },
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Scro", item: siteUrl },
        { "@type": "ListItem", position: 2, name: title, item: pageUrl },
      ],
    },
  ];

  if (includeSoftwareOffer) {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${pageUrl}#software`,
      name: title,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      url: pageUrl,
      description,
      offers: {
        "@type": "AggregateOffer",
        lowPrice: String(PLANS.starter.amountUsd),
        highPrice: String(PLANS.scale.amountUsd),
        priceCurrency: "USD",
        offerCount: Object.keys(PLANS).length,
        url: `${siteUrl}/pricing`,
      },
    });
  }

  const data = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

// JSON-LD for a feature landing, using that page's translated SEO title and description.
export async function MarketingPageJsonLd({ pageKey }: { pageKey: MarketingPageKey }) {
  const locale = await getRequestLocale();
  const seo = getMessages(locale)[pageKey].seo;
  return (
    <PublicPageJsonLd
      path={KEY_TO_PATH[pageKey]}
      title={seo.title}
      description={seo.description}
      includeSoftwareOffer
    />
  );
}
