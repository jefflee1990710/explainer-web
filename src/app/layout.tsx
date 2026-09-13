import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist_Mono, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const notoSansTc = Noto_Sans_TC({
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Explainer — 概念解說影片",
  description:
    "把概念講清楚，做成 Reels、行銷、簡報與更多用途的 explainer 影片。選風格、核准分鏡、產出 clips。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`${notoSansTc.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${notoSansTc.className} min-h-full flex flex-col bg-background text-foreground`}>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
