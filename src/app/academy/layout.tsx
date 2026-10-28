import type { Metadata } from "next";
import type { ReactNode } from "react";

// Academy stays on its URL for direct links. It is not listed in nav, sitemap, or search.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AcademyLayout({ children }: { children: ReactNode }) {
  return children;
}
