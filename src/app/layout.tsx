import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist_Mono, Noto_Sans_TC } from "next/font/google";
import { GoogleAnalytics } from "@/presentation/components/analytics/google-analytics";
import { AdhocBonusProvider } from "@/presentation/components/adhoc-bonus";
import { I18nProvider } from "@/presentation/components/i18n-provider";
import { adhocBonusPercent } from "@/service/billing/promo";
import { getSiteUrl } from "@/util/app-url";
import { DEFAULT_LOCALE, getMessages, isLocaleId, LOCALE_STORAGE_KEY, type LocaleId } from "@/util/i18n";
import "./globals.css";

async function localeFromCookie(): Promise<LocaleId> {
  const jar = await cookies();
  const stored = jar.get(LOCALE_STORAGE_KEY)?.value;
  return isLocaleId(stored) ? stored : DEFAULT_LOCALE;
}

const notoSansTc = Noto_Sans_TC({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  // CJK is not a preloadable subset; webpack errors without this, and Turbopack 16.3
  // then fails resolving the many unicode-range files.
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await localeFromCookie();
  const messages = getMessages(locale);
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    applicationName: "Scro",
    title: {
      default: messages.meta.title,
      template: "%s",
    },
    description: messages.meta.description,
    keywords: [
      "Scro",
      "AI Influencer",
      "Virtual KOL",
      "Explainer Video",
      "Talking Head Video",
      "Cantonese AI Video",
      "Product Promo Video",
      "UGC Video Generator",
      "Whiteboard Explainer",
      "Custom Wardrobe AI",
    ],
    authors: [{ name: "Scro", url: siteUrl }],
    creator: "Scro",
    publisher: "Scro",
    openGraph: {
      title: messages.meta.title,
      description: messages.meta.description,
      url: siteUrl,
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const initialLocale = await localeFromCookie();

  return (
    <html
      lang={initialLocale}
      className={`${notoSansTc.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-dvh flex-col bg-background font-sans text-foreground"
      >
        <GoogleAnalytics />
        <I18nProvider initialLocale={initialLocale}>
          <AdhocBonusProvider percent={adhocBonusPercent()}>{children}</AdhocBonusProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
