import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist_Mono, Noto_Sans_TC } from "next/font/google";
import { I18nProvider } from "@/presentation/components/i18n-provider";
import "./globals.css";

const notoSansTc = Noto_Sans_TC({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scro — 概念解說影片",
  description:
    "把概念講清楚，做成 Reels、行銷、簡報與更多用途的 explainer 影片。選風格、核准分鏡、產出 clips。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${notoSansTc.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className={`${notoSansTc.className} flex min-h-dvh flex-col bg-background text-foreground`}
      >
        <ClerkProvider>
          <I18nProvider>{children}</I18nProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
